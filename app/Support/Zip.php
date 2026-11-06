<?php

namespace App\Support;

/**
 * Minimal ZIP reader/writer.
 *
 * The PHP build in use has no ext-zip, so this implements just enough of the
 * ZIP specification to read and write the archives the export/import feature
 * needs: the xlsx workbooks we produce and the .xlsx files a client may
 * upload. Entries are deflated with gzdeflate(), which is raw DEFLATE - the
 * exact payload a ZIP entry with method 8 expects.
 */
class Zip
{
    /**
     * Build a ZIP archive from an ordered map of path => contents.
     */
    public static function create(array $files): string
    {
        $local = '';
        $central = '';
        $offset = 0;
        $count = 0;

        [$dosTime, $dosDate] = self::dosTimestamp();

        foreach ($files as $name => $contents) {
            $name = str_replace('\\', '/', (string) $name);
            $crc = crc32($contents);
            $uncompressed = strlen($contents);
            $deflated = gzdeflate($contents, 6);

            // Fall back to STORE when deflating does not pay off.
            if ($deflated === false || strlen($deflated) >= $uncompressed) {
                $deflated = $contents;
                $method = 0;
            } else {
                $method = 8;
            }

            $compressed = strlen($deflated);

            $localHeader = pack('V', 0x04034B50)
                .pack('v', 20)          // version needed
                .pack('v', 0x0800)      // flags: UTF-8 filenames
                .pack('v', $method)
                .pack('v', $dosTime)
                .pack('v', $dosDate)
                .pack('V', $crc)
                .pack('V', $compressed)
                .pack('V', $uncompressed)
                .pack('v', strlen($name))
                .pack('v', 0)
                .$name;

            $local .= $localHeader.$deflated;

            $central .= pack('V', 0x02014B50)
                .pack('v', 20)          // version made by
                .pack('v', 20)          // version needed
                .pack('v', 0x0800)
                .pack('v', $method)
                .pack('v', $dosTime)
                .pack('v', $dosDate)
                .pack('V', $crc)
                .pack('V', $compressed)
                .pack('V', $uncompressed)
                .pack('v', strlen($name))
                .pack('v', 0)           // extra
                .pack('v', 0)           // comment
                .pack('v', 0)           // disk number start
                .pack('v', 0)           // internal attributes
                .pack('V', 0)           // external attributes
                .pack('V', $offset)
                .$name;

            $offset += strlen($localHeader) + $compressed;
            $count++;
        }

        $end = pack('V', 0x06054B50)
            .pack('v', 0)
            .pack('v', 0)
            .pack('v', $count)
            .pack('v', $count)
            .pack('V', strlen($central))
            .pack('V', $offset)
            .pack('v', 0);

        return $local.$central.$end;
    }

    /**
     * Read a ZIP archive from disk into an ordered map of path => contents.
     *
     * @return array<string, string>
     */
    public static function read(string $path): array
    {
        $data = @file_get_contents($path);

        if ($data === false) {
            throw new \RuntimeException('The archive could not be read.');
        }

        return self::readFromString($data);
    }

    /**
     * Read a ZIP archive held in memory into an ordered map of path => contents.
     *
     * @return array<string, string>
     */
    public static function readFromString(string $data): array
    {
        $entries = [];
        $eocdPos = strrpos($data, "\x50\x4b\x05\x06");

        if ($eocdPos === false) {
            throw new \RuntimeException('This is not a valid ZIP archive.');
        }

        $total = self::u16($data, $eocdPos + 10);
        $centralOffset = self::u32($data, $eocdPos + 16);

        $pointer = $centralOffset;

        for ($i = 0; $i < $total; $i++) {
            if (substr($data, $pointer, 4) !== "\x50\x4b\x01\x02") {
                throw new \RuntimeException('The archive central directory is damaged.');
            }

            $method = self::u16($data, $pointer + 10);
            $crc = self::u32($data, $pointer + 16);
            $compressedSize = self::u32($data, $pointer + 20);
            $nameLength = self::u16($data, $pointer + 28);
            $extraLength = self::u16($data, $pointer + 30);
            $commentLength = self::u16($data, $pointer + 32);
            $localOffset = self::u32($data, $pointer + 42);

            $name = substr($data, $pointer + 46, $nameLength);
            $pointer += 46 + $nameLength + $extraLength + $commentLength;

            if (substr($data, $localOffset, 4) !== "\x50\x4b\x03\x04") {
                throw new \RuntimeException('The archive entry "'.$name.'" is damaged.');
            }

            $localNameLength = self::u16($data, $localOffset + 26);
            $localExtraLength = self::u16($data, $localOffset + 28);

            $dataStart = $localOffset + 30 + $localNameLength + $localExtraLength;
            $payload = substr($data, $dataStart, $compressedSize);

            if ($method === 8) {
                $inflated = @gzinflate($payload);
                $payload = $inflated === false ? '' : $inflated;
            } elseif ($method !== 0) {
                throw new \RuntimeException('Unsupported compression in archive entry "'.$name.'".');
            }

            // Skip directory entries.
            if (! str_ends_with($name, '/')) {
                $entries[$name] = $payload;
            }
        }

        return $entries;
    }

    /**
     * Read a 16-bit little-endian value.
     */
    protected static function u16(string $data, int $offset): int
    {
        $value = unpack('v', substr($data, $offset, 2));

        return $value === false ? 0 : (int) $value[1];
    }

    /**
     * Read a 32-bit little-endian value.
     */
    protected static function u32(string $data, int $offset): int
    {
        $value = unpack('V', substr($data, $offset, 4));

        return $value === false ? 0 : (int) $value[1];
    }

    /**
     * Current time as an MS-DOS time/date pair.
     *
     * @return array{0: int, 1: int}
     */
    protected static function dosTimestamp(): array
    {
        $parts = getdate();
        $time = ($parts['hours'] << 11) | ($parts['minutes'] << 5) | ($parts['seconds'] >> 1);
        $date = ((($parts['year'] - 1980) & 0x7F) << 9) | ($parts['mon'] << 5) | $parts['mday'];

        return [$time, $date];
    }
}
