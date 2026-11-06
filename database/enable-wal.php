<?php

$dbPath = __DIR__ . '/database.sqlite';
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Set WAL mode
$currentMode = $pdo->query('PRAGMA journal_mode')->fetchColumn();
echo "Previous journal_mode: " . $currentMode . PHP_EOL;

$newMode = $pdo->query('PRAGMA journal_mode = WAL')->fetchColumn();
echo "New journal_mode: " . $newMode . PHP_EOL;

// Set synchronous to NORMAL (recommended with WAL for high performance + crash safety)
$pdo->exec('PRAGMA synchronous = NORMAL');
$sync = $pdo->query('PRAGMA synchronous')->fetchColumn();
echo "PRAGMA synchronous: " . $sync . PHP_EOL;

// Set busy timeout to 5000 ms (5 seconds)
$pdo->exec('PRAGMA busy_timeout = 5000');

echo "SQLite WAL configuration applied successfully!" . PHP_EOL;
