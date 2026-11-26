<?php

namespace App\Console\Commands;

use App\Models\Document;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateStorageToPrivate extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage:migrate-to-private {--dry-run : Simulate file migration without modifying files}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely migrate documents, task attachments, and comment attachments from public to private storage';

    /**
     * Allowed directories to migrate. Excludes profile photos and IT assets.
     */
    protected array $allowedDirectories = [
        'documents',
        'task_attachments',
        'task_comment_attachments',
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');

        $this->info($isDryRun
            ? '=== MIGRATING STORAGE TO PRIVATE (DRY RUN) ==='
            : '=== MIGRATING STORAGE TO PRIVATE ==='
        );

        $filesToProcess = $this->collectTargetFiles();

        $totalFound = count($filesToProcess);
        $this->line("Discovered {$totalFound} file candidate(s) across database records and target storage directories.");

        $migrated = 0;
        $alreadyPrivate = 0;
        $failed = 0;
        $missing = 0;

        foreach ($filesToProcess as $relativePath) {
            $existsOnPublic = Storage::disk('public')->exists($relativePath);
            $existsOnLocal = Storage::disk('local')->exists($relativePath);

            if (! $existsOnPublic && ! $existsOnLocal) {
                $this->warn(" [MISSING] File referenced in database but missing on both disks: {$relativePath}");
                $missing++;
                continue;
            }

            if (! $existsOnPublic && $existsOnLocal) {
                $this->line(" [OK] Already on private disk: {$relativePath}");
                $alreadyPrivate++;
                continue;
            }

            $publicSize = Storage::disk('public')->size($relativePath);

            if ($existsOnLocal) {
                $localSize = Storage::disk('local')->size($relativePath);
                if ($localSize === $publicSize) {
                    $this->line(" [ALREADY COPIED] Identical file exists on private disk: {$relativePath}");
                    if (! $isDryRun) {
                        Storage::disk('public')->delete($relativePath);
                        $this->line("   -> Cleaned up redundant public source file.");
                    } else {
                        $this->line("   -> [DRY-RUN] Would remove redundant public source file.");
                    }
                    $alreadyPrivate++;
                    continue;
                }
            }

            // Need to migrate from public to local
            if ($isDryRun) {
                $this->info(" [DRY-RUN] Would copy to private disk & remove from public: {$relativePath} ({$publicSize} bytes)");
                $migrated++;
                continue;
            }

            try {
                $stream = Storage::disk('public')->readStream($relativePath);
                if ($stream === false) {
                    throw new \RuntimeException("Unable to open read stream for public file: {$relativePath}");
                }

                $written = Storage::disk('local')->writeStream($relativePath, $stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }

                if (! $written) {
                    throw new \RuntimeException("Failed writing stream to private storage: {$relativePath}");
                }

                // Verify file exists and size matches
                if (! Storage::disk('local')->exists($relativePath)) {
                    throw new \RuntimeException("Verification failed: file missing on private storage after write: {$relativePath}");
                }

                $writtenSize = Storage::disk('local')->size($relativePath);
                if ($writtenSize !== $publicSize) {
                    throw new \RuntimeException("Verification failed: size mismatch (public: {$publicSize}, private: {$writtenSize}) for {$relativePath}");
                }

                // Optional checksum check
                $publicChecksum = md5(Storage::disk('public')->get($relativePath));
                $localChecksum = md5(Storage::disk('local')->get($relativePath));
                if (! hash_equals($publicChecksum, $localChecksum)) {
                    throw new \RuntimeException("Verification failed: checksum mismatch for {$relativePath}");
                }

                // Safe to remove from public disk
                Storage::disk('public')->delete($relativePath);
                $this->info(" [MIGRATED] Successfully moved to private disk: {$relativePath}");
                $migrated++;
            } catch (\Throwable $e) {
                $this->error(" [FAILED] Error migrating {$relativePath}: " . $e->getMessage());
                // Clean up partial write on local if exists
                if (Storage::disk('local')->exists($relativePath) && ! $existsOnLocal) {
                    Storage::disk('local')->delete($relativePath);
                }
                $failed++;
            }
        }

        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Target Files Found', $totalFound],
                [$isDryRun ? 'Files To Migrate' : 'Successfully Migrated', $migrated],
                ['Already On Private Disk', $alreadyPrivate],
                ['Missing On Both Disks', $missing],
                ['Failed Migrations', $failed],
            ]
        );

        if ($failed > 0) {
            $this->error("Migration completed with {$failed} failure(s). Check logs above.");
            return self::FAILURE;
        }

        $this->info($isDryRun ? 'Dry run completed successfully.' : 'Storage migration completed successfully.');
        return self::SUCCESS;
    }

    /**
     * Collect and sanitize target file paths from database records and storage directories.
     */
    protected function collectTargetFiles(): array
    {
        $files = collect();

        // 1. Files from Document records
        try {
            $docFiles = Document::query()
                ->whereNotNull('file_path')
                ->pluck('file_path')
                ->all();
            $files = $files->merge($docFiles);
        } catch (\Throwable $e) {
            $this->warn('Could not query Document table: ' . $e->getMessage());
        }

        // 2. Files from TaskAttachment records
        try {
            $taskFiles = TaskAttachment::query()
                ->whereNotNull('file_path')
                ->pluck('file_path')
                ->all();
            $files = $files->merge($taskFiles);
        } catch (\Throwable $e) {
            $this->warn('Could not query TaskAttachment table: ' . $e->getMessage());
        }

        // 3. Files from TaskComment records
        try {
            $commentFiles = TaskComment::query()
                ->whereNotNull('file_path')
                ->pluck('file_path')
                ->all();
            $files = $files->merge($commentFiles);
        } catch (\Throwable $e) {
            $this->warn('Could not query TaskComment table: ' . $e->getMessage());
        }

        // 4. Files present on public disk in allowed directories
        foreach ($this->allowedDirectories as $dir) {
            try {
                if (Storage::disk('public')->exists($dir)) {
                    $scanned = Storage::disk('public')->allFiles($dir);
                    $files = $files->merge($scanned);
                }
            } catch (\Throwable $e) {
                $this->warn("Could not scan directory '{$dir}' on public disk: " . $e->getMessage());
            }

            try {
                if (Storage::disk('local')->exists($dir)) {
                    $scanned = Storage::disk('local')->allFiles($dir);
                    $files = $files->merge($scanned);
                }
            } catch (\Throwable $e) {
                $this->warn("Could not scan directory '{$dir}' on local disk: " . $e->getMessage());
            }
        }

        // Filter and normalize paths: must match allowed directories
        return $files
            ->map(fn($p) => trim(str_replace('\\', '/', $p), '/'))
            ->filter(function ($path) {
                if (empty($path)) {
                    return false;
                }
                foreach ($this->allowedDirectories as $allowedDir) {
                    if (str_starts_with($path, $allowedDir . '/')) {
                        return true;
                    }
                }
                return false;
            })
            ->unique()
            ->values()
            ->all();
    }
}
