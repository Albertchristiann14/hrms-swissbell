<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Department;
use App\Models\Document;
use App\Models\Employee;
use App\Models\ItAsset;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SecureFileStorageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('local');

        // Create core roles
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'HRD / Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'General Manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Employee', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'IT Support', 'guard_name' => 'web']);
    }

    private function createEmployeeUser(string $name, ?Department $dept = null, array $roles = []): array
    {
        $user = User::factory()->create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '.', $name)) . '@swiss-belhotel.com',
            'status' => 'approved',
        ]);

        if (! empty($roles)) {
            $user->assignRole($roles);
        }

        $employee = Employee::create([
            'user_id' => $user->id,
            'department_id' => $dept?->id,
            'employee_number' => 'EMP-' . strtoupper(substr(uniqid(), -6)),
            'first_name' => explode(' ', $name)[0],
            'last_name' => explode(' ', $name)[1] ?? 'User',
            'email' => $user->email,
            'status' => 'active',
            'hire_date' => now()->toDateString(),
        ]);

        return [$user, $employee];
    }

    // =========================================================================
    // 1. PROFILE PHOTO TESTS
    // =========================================================================

    public function test_profile_photo_upload_rejects_files_over_2mb(): void
    {
        [$user] = $this->createEmployeeUser('Alice Test');

        $largePhoto = UploadedFile::fake()->create('avatar.jpg', 2049, 'image/jpeg');

        $response = $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => $largePhoto,
        ]);

        $response->assertSessionHasErrors(['photo']);
        $this->assertNull($user->fresh()->profile_photo_path);
    }

    public function test_profile_photo_upload_rejects_non_allowed_formats(): void
    {
        [$user] = $this->createEmployeeUser('Bob Test');

        $pdfFile = UploadedFile::fake()->create('avatar.pdf', 500, 'application/pdf');

        $response = $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => $pdfFile,
        ]);

        $response->assertSessionHasErrors(['photo']);
        $this->assertNull($user->fresh()->profile_photo_path);
    }

    public function test_profile_photo_upload_accepts_valid_image_and_deletes_old_photo(): void
    {
        [$user] = $this->createEmployeeUser('Charlie Test');

        $validPhoto = UploadedFile::fake()->image('avatar.jpg', 300, 300)->size(500);

        $response = $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => $validPhoto,
        ]);

        $response->assertSessionHasNoErrors();
        $user->refresh();

        $this->assertNotNull($user->profile_photo_path);
        Storage::disk('public')->assertExists($user->profile_photo_path);

        $firstPhotoPath = $user->profile_photo_path;

        // Upload second photo
        $secondPhoto = UploadedFile::fake()->image('avatar2.png', 400, 400)->size(600);
        $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => $secondPhoto,
        ]);

        $user->refresh();
        $this->assertNotSame($firstPhotoPath, $user->profile_photo_path);
        Storage::disk('public')->assertExists($user->profile_photo_path);
        Storage::disk('public')->assertMissing($firstPhotoPath);
    }

    // =========================================================================
    // 2. IT ASSET PHOTO TESTS
    // =========================================================================

    public function test_it_asset_photo_upload_rejects_files_over_2mb(): void
    {
        [$itUser] = $this->createEmployeeUser('IT Staff', null, ['Super Admin']);

        $largePhoto = UploadedFile::fake()->create('laptop.jpg', 2049, 'image/jpeg');

        $response = $this->actingAs($itUser)->post(route('it.assets.store'), [
            'asset_code' => 'AST-001',
            'name' => 'Office Laptop',
            'category' => 'Hardware',
            'status' => 'Available',
            'photo' => $largePhoto,
        ]);

        $response->assertSessionHasErrors(['photo']);
        $this->assertDatabaseMissing('it_assets', ['asset_code' => 'AST-001']);
    }

    public function test_it_asset_photo_upload_accepts_valid_photo_on_public_disk(): void
    {
        [$itUser] = $this->createEmployeeUser('IT Admin', null, ['Super Admin']);

        $validPhoto = UploadedFile::fake()->image('laptop.png', 400, 300)->size(800);

        $response = $this->actingAs($itUser)->post(route('it.assets.store'), [
            'asset_code' => 'AST-002',
            'name' => 'Workstation PC',
            'category' => 'Hardware',
            'status' => 'Available',
            'photo' => $validPhoto,
        ]);

        $response->assertSessionHasNoErrors();
        $asset = ItAsset::where('asset_code', 'AST-002')->first();
        $this->assertNotNull($asset);
        $this->assertNotNull($asset->photo);
        Storage::disk('public')->assertExists($asset->photo);
    }

    // =========================================================================
    // 3. DOCUMENT STORAGE & AUTHORIZATION TESTS
    // =========================================================================

    public function test_document_is_stored_on_private_disk_and_enforces_10mb_limit(): void
    {
        [$adminUser] = $this->createEmployeeUser('Admin User', null, ['Super Admin']);

        // Over 10MB
        $hugeDoc = UploadedFile::fake()->create('report.pdf', 10241, 'application/pdf');
        $respLarge = $this->actingAs($adminUser)->post(route('documents.store'), [
            'title' => 'Big Report',
            'type' => 'PDF',
            'file' => $hugeDoc,
        ]);
        $respLarge->assertSessionHasErrors(['file']);

        // Valid 5MB document
        $validDoc = UploadedFile::fake()->create('handbook.pdf', 5000, 'application/pdf');
        $respValid = $this->actingAs($adminUser)->post(route('documents.store'), [
            'title' => 'Employee Handbook',
            'type' => 'PDF',
            'file' => $validDoc,
        ]);

        $respValid->assertSessionHasNoErrors();
        $doc = Document::where('title', 'Employee Handbook')->first();
        $this->assertNotNull($doc);

        // Stored on private (local) disk, NOT on public disk
        Storage::disk('local')->assertExists($doc->file_path);
        Storage::disk('public')->assertMissing($doc->file_path);
    }

    public function test_document_department_isolation_and_privileged_access(): void
    {
        $hrDept = Department::create(['name' => 'Human Resources']);
        $itDept = Department::create(['name' => 'IT Support']);

        [$hrUser] = $this->createEmployeeUser('HR Officer', $hrDept, ['Employee']);
        [$itUser] = $this->createEmployeeUser('IT Tech', $itDept, ['Employee']);
        [$gmUser] = $this->createEmployeeUser('General Manager', null, ['General Manager']);

        // HR Department Document stored on private disk
        Storage::disk('local')->put('documents/hr_policy.pdf', 'Confidential HR Content');
        $hrDoc = Document::create([
            'title' => 'HR Salary Policy',
            'file_path' => 'documents/hr_policy.pdf',
            'type' => 'PDF',
            'department_id' => $hrDept->id,
            'uploaded_by' => $hrUser->id,
        ]);

        // IT User from another department cannot download HR doc -> 403
        $respForbidden = $this->actingAs($itUser)->get(route('documents.download', $hrDoc->id));
        $respForbidden->assertStatus(403);

        // HR User from same department can download -> 200
        $respAllowed = $this->actingAs($hrUser)->get(route('documents.download', $hrDoc->id));
        $respAllowed->assertStatus(200);

        // GM (Privileged) can download any department doc -> 200
        $respGm = $this->actingAs($gmUser)->get(route('documents.download', $hrDoc->id));
        $respGm->assertStatus(200);

        // Non-existent document file returns 404 (not 500)
        $ghostDoc = Document::create([
            'title' => 'Ghost Document',
            'file_path' => 'documents/missing_file.pdf',
            'type' => 'PDF',
            'uploaded_by' => $hrUser->id,
        ]);
        $resp404 = $this->actingAs($gmUser)->get(route('documents.download', $ghostDoc->id));
        $resp404->assertStatus(404);
    }

    // =========================================================================
    // 4. TASK ATTACHMENT TESTS
    // =========================================================================

    public function test_task_attachment_stored_on_private_disk_and_authorized(): void
    {
        $dept = Department::create(['name' => 'Front Office']);
        [$creator, $creatorEmp] = $this->createEmployeeUser('Task Creator', $dept, ['Employee']);
        [$outsider] = $this->createEmployeeUser('Outsider', null, ['Employee']);

        $project = Project::create(['name' => 'Front Desk Overhaul', 'status' => ProjectStatus::Planning->value]);
        $task = Task::create([
            'title' => 'Front Office Setup',
            'project_id' => $project->id,
            'created_by' => $creator->id,
            'priority' => TaskPriority::Normal->value,
            'status' => TaskStatus::ToDo->value,
        ]);

        // Upload attachment
        $file = UploadedFile::fake()->create('schedule.xlsx', 1000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $respUpload = $this->actingAs($creator)->post(route('tasks.attachments.store', $task->id), [
            'file' => $file,
        ]);
        $respUpload->assertSessionHasNoErrors();

        $attachment = TaskAttachment::where('task_id', $task->id)->first();
        $this->assertNotNull($attachment);

        // Verified on private disk, NOT on public
        Storage::disk('local')->assertExists($attachment->file_path);
        Storage::disk('public')->assertMissing($attachment->file_path);

        // Outsider cannot download -> 403
        $respForbidden = $this->actingAs($outsider)->get(route('tasks.attachments.download', $attachment->id));
        $respForbidden->assertStatus(403);

        // Task creator can download -> 200
        $respAllowed = $this->actingAs($creator)->get(route('tasks.attachments.download', $attachment->id));
        $respAllowed->assertStatus(200);
    }

    // =========================================================================
    // 5. TASK COMMENT ATTACHMENT TESTS
    // =========================================================================

    public function test_task_comment_attachment_stored_on_private_disk_and_authorized(): void
    {
        [$creator] = $this->createEmployeeUser('Lead Worker', null, ['Employee']);
        [$outsider] = $this->createEmployeeUser('Stranger', null, ['Employee']);

        $project = Project::create(['name' => 'Maintenance Project', 'status' => ProjectStatus::Planning->value]);
        $task = Task::create([
            'title' => 'AC Maintenance',
            'project_id' => $project->id,
            'created_by' => $creator->id,
            'priority' => TaskPriority::Normal->value,
            'status' => TaskStatus::ToDo->value,
        ]);

        // Add comment with image attachment
        $image = UploadedFile::fake()->image('broken_pipe.png', 500, 400)->size(800);
        $respComment = $this->actingAs($creator)->post(route('tasks.comments.store', $task->id), [
            'content' => 'Photo of the broken pipe',
            'file' => $image,
        ]);
        $respComment->assertSessionHasNoErrors();

        $comment = TaskComment::where('task_id', $task->id)->first();
        $this->assertNotNull($comment);
        $this->assertNotNull($comment->file_path);

        // Verify stored on private disk, NOT on public
        Storage::disk('local')->assertExists($comment->file_path);
        Storage::disk('public')->assertMissing($comment->file_path);

        // Outsider cannot access -> 403
        $respForbidden = $this->actingAs($outsider)->get(route('tasks.comments.attachments.download', $comment->id));
        $respForbidden->assertStatus(403);

        // Creator can access image inline -> 200
        $respAllowed = $this->actingAs($creator)->get(route('tasks.comments.attachments.download', $comment->id));
        $respAllowed->assertStatus(200);
        $respAllowed->assertHeader('Content-Type', 'image/png');
    }

    // =========================================================================
    // 6. MIGRATION COMMAND TESTS
    // =========================================================================

    public function test_storage_migration_command_dry_run_and_execution(): void
    {
        // 1. Simulate legacy files on public disk
        Storage::disk('public')->put('documents/legacy_doc.pdf', 'Legacy Document Content');
        Storage::disk('public')->put('task_attachments/legacy_task.pdf', 'Legacy Task Content');
        Storage::disk('public')->put('task_comment_attachments/legacy_comment.png', 'Legacy Comment Image Content');
        // Profile photo should NOT be touched
        Storage::disk('public')->put('profile-photos/user_avatar.jpg', 'Avatar Content');

        // Create DB records pointing to these paths
        [$uploader] = $this->createEmployeeUser('Legacy Uploader');
        Document::create([
            'title' => 'Legacy Document',
            'file_path' => 'documents/legacy_doc.pdf',
            'type' => 'PDF',
            'uploaded_by' => $uploader->id,
        ]);

        // Dry Run
        $exitCodeDryRun = Artisan::call('storage:migrate-to-private', ['--dry-run' => true]);
        $this->assertSame(0, $exitCodeDryRun);

        // Verify files still exist on public and do NOT yet exist on local
        Storage::disk('public')->assertExists('documents/legacy_doc.pdf');
        Storage::disk('public')->assertExists('task_attachments/legacy_task.pdf');
        Storage::disk('public')->assertExists('task_comment_attachments/legacy_comment.png');
        Storage::disk('public')->assertExists('profile-photos/user_avatar.jpg');
        Storage::disk('local')->assertMissing('documents/legacy_doc.pdf');

        // Full Run
        $exitCodeReal = Artisan::call('storage:migrate-to-private');
        $this->assertSame(0, $exitCodeReal);

        // Verify migrated to local disk and removed from public disk
        Storage::disk('local')->assertExists('documents/legacy_doc.pdf');
        Storage::disk('local')->assertExists('task_attachments/legacy_task.pdf');
        Storage::disk('local')->assertExists('task_comment_attachments/legacy_comment.png');

        Storage::disk('public')->assertMissing('documents/legacy_doc.pdf');
        Storage::disk('public')->assertMissing('task_attachments/legacy_task.pdf');
        Storage::disk('public')->assertMissing('task_comment_attachments/legacy_comment.png');

        // Verify profile photo was NOT touched
        Storage::disk('public')->assertExists('profile-photos/user_avatar.jpg');

        // Idempotency check: Running again succeeds with 0 failures
        $exitCodeIdempotent = Artisan::call('storage:migrate-to-private');
        $this->assertSame(0, $exitCodeIdempotent);
    }
}
