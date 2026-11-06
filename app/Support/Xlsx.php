<?php

namespace App\Support;

/**
 * Minimal XLSX reader/writer.
 *
 * The project has no spreadsheet library, so this writes and reads the small
 * subset of the SpreadsheetML format that the export/import feature needs:
 * a single worksheet with one header row, plain inline strings and numeric
 * cells. Numbers stay numeric so Excel can total and sort them.
 */
class Xlsx
{
    /**
     * Build an .xlsx workbook.
     *
     * @param  array<string>  $headers  Column headings.
     * @param  array<int, array<int, scalar|null>>  $rows  Data rows.
     * @param  array<int, array{0: int, 1: float}>|null  $widths  Optional [column index, width] pairs.
     */
    public static function write(array $headers, array $rows, ?array $widths = null, string $sheetName = 'Data'): string
    {
        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n";
        $xml .= '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';

        if ($widths) {
            $xml .= '<cols>';
            foreach ($widths as [$index, $width]) {
                $xml .= '<col min="'.((int) $index + 1).'" max="'.((int) $index + 1).'" width="'.((float) $width).'" customWidth="1"/>';
            }
            $xml .= '</cols>';
        }

        $xml .= '<sheetData>';

        $rowNumber = 1;
        $xml .= self::row($rowNumber, $headers, true);

        foreach ($rows as $row) {
            $rowNumber++;
            $xml .= self::row($rowNumber, array_values($row), false);
        }

        $xml .= '</sheetData></worksheet>';

        return Zip::create([
            '[Content_Types].xml' => self::contentTypes(),
            '_rels/.rels' => self::rootRels(),
            'xl/workbook.xml' => self::workbook($sheetName),
            'xl/_rels/workbook.xml.rels' => self::workbookRels(),
            'xl/styles.xml' => self::styles(),
            'xl/worksheets/sheet1.xml' => $xml,
        ]);
    }

    /**
     * Read the first worksheet of an .xlsx file into rows of values.
     *
     * @return array<int, array<int, string>>
     */
    public static function read(string $path): array
    {
        $entries = Zip::read($path);

        if (! isset($entries['xl/worksheets/sheet1.xml'])) {
            throw new \RuntimeException('The workbook does not contain a readable worksheet.');
        }

        $shared = [];
        if (isset($entries['xl/sharedStrings.xml'])) {
            $shared = self::sharedStrings($entries['xl/sharedStrings.xml']);
        }

        return self::sheetRows($entries['xl/worksheets/sheet1.xml'], $shared);
    }

    // ---------------------------------------------------------------------
    // Writing
    // ---------------------------------------------------------------------

    protected static function row(int $number, array $cells, bool $header): string
    {
        $xml = '<row r="'.$number.'">';

        foreach (array_values($cells) as $index => $value) {
            $reference = self::columnName($index).$number;
            $style = $header ? ' s="1"' : '';

            if ($value === null || $value === '') {
                $xml .= '<c r="'.$reference.'"'.$style.'/>';
            } elseif (is_int($value) || is_float($value)) {
                $xml .= '<c r="'.$reference.'"'.$style.'><v>'.self::number($value).'</v></c>';
            } else {
                $xml .= '<c r="'.$reference.'" t="inlineStr"'.$style.'><is><t xml:space="preserve">'
                    .self::escape((string) $value).'</t></is></c>';
            }
        }

        return $xml.'</row>';
    }

    protected static function columnName(int $index): string
    {
        $name = '';
        $index++;

        while ($index > 0) {
            $remainder = ($index - 1) % 26;
            $name = chr(65 + $remainder).$name;
            $index = (int) (($index - $remainder) / 26);
        }

        return $name;
    }

    protected static function number(int|float $value): string
    {
        if (is_int($value)) {
            return (string) $value;
        }

        $formatted = rtrim(rtrim(number_format($value, 4, '.', ''), '0'), '.');

        return $formatted === '' || $formatted === '-' ? '0' : $formatted;
    }

    protected static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    protected static function contentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n"
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'</Types>';
    }

    protected static function rootRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n"
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'</Relationships>';
    }

    protected static function workbook(string $sheetName): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n"
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            .'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets><sheet name="'.self::escape($sheetName).'" sheetId="1" r:id="rId1"/></sheets>'
            .'</workbook>';
    }

    protected static function workbookRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n"
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'</Relationships>';
    }

    protected static function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n"
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="2">'
            .'<font><sz val="11"/><name val="Calibri"/></font>'
            .'<font><b/><sz val="11"/><name val="Calibri"/></font>'
            .'</fonts>'
            .'<fills count="2">'
            .'<fill><patternFill patternType="none"/></fill>'
            .'<fill><patternFill patternType="gray125"/></fill>'
            .'</fills>'
            .'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="2">'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            .'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
            .'</cellXfs>'
            .'</styleSheet>';
    }

    // ---------------------------------------------------------------------
    // Reading
    // ---------------------------------------------------------------------

    /**
     * @return array<int, string>
     */
    protected static function sharedStrings(string $xml): array
    {
        $strings = [];

        if (preg_match_all('/<si>(.*?)<\/si>/s', $xml, $matches)) {
            foreach ($matches[1] as $index => $chunk) {
                $text = '';
                if (preg_match_all('/<t[^>]*>(.*?)<\/t>/s', $chunk, $texts)) {
                    $text = implode('', $texts[1]);
                }
                $strings[$index] = html_entity_decode($text, ENT_XML1, 'UTF-8');
            }
        }

        return $strings;
    }

    /**
     * @param  array<int, string>  $shared
     * @return array<int, array<int, string>>
     */
    protected static function sheetRows(string $xml, array $shared): array
    {
        $rows = [];

        if (! preg_match_all('/<row[^>]*>(.*?)<\/row>/s', $xml, $rowMatches)) {
            return [];
        }

        foreach ($rowMatches[1] as $rowXml) {
            $cells = [];

            if (preg_match_all('/<c\b([^>]*)(?:\/>|>(.*?)<\/c>)/s', $rowXml, $cellMatches, PREG_SET_ORDER)) {
                foreach ($cellMatches as $cell) {
                    $attributes = $cell[1];
                    $body = $cell[2] ?? '';

                    $reference = 1;
                    if (preg_match('/r="([A-Z]+)\d+"/', $attributes, $m)) {
                        $reference = self::columnIndex($m[1]);
                    }

                    $type = '';
                    if (preg_match('/t="([^"]+)"/', $attributes, $m)) {
                        $type = $m[1];
                    }

                    $value = '';

                    if ($type === 'inlineStr') {
                        if (preg_match_all('/<t[^>]*>(.*?)<\/t>/s', $body, $texts)) {
                            $value = html_entity_decode(implode('', $texts[1]), ENT_XML1, 'UTF-8');
                        }
                    } elseif ($type === 's') {
                        if (preg_match('/<v>(\d+)<\/v>/', $body, $m)) {
                            $value = $shared[(int) $m[1]] ?? '';
                        }
                    } elseif (preg_match('/<v>(.*?)<\/v>/s', $body, $m)) {
                        $value = html_entity_decode(trim($m[1]), ENT_XML1, 'UTF-8');
                    }

                    $cells[$reference - 1] = $value;
                }
            }

            ksort($cells);
            $rows[] = array_values($cells);
        }

        return $rows;
    }

    protected static function columnIndex(string $letters): int
    {
        $index = 0;

        foreach (str_split($letters) as $character) {
            $index = $index * 26 + (ord($character) - 64);
        }

        return $index;
    }
}
