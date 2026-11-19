<?php

namespace Tests\Feature;

use App\Enums\ProjectStatus;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Document;
use App\Models\Employee;
use App\Models\ItTicket;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskChecklist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure baseline roles exist
        Role::findOrCreate('Super Admin');
        Role::findOrCreate('HRD / Admin');
        Role::findOrCreate('General Manager');
        Role::findOrCreate('Staff');
    }

    public function test_unauthenticated_attendance_sync_is_rejected(): void
    {
        Config::set('services.attendance.sync_key', 'super-secret-sync-key-12345');

        $response = $this->postJson('/api/attendance/sync', [
            'employee_id' => 1,
            'date' => '2026-10-23',
            'status' => 'Present',
        ]);

        $response->assertStatus(401);
    }

    public function test_attendance_sync_with_valid_api_key_succeeds(): void
    {
        Config::set('services.attendance.sync_key', 'valid-secret-key-xyz');

        $user = User::factory()->create();
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_number' => 'EMP-SYNC-01',
            'first_name' => 'John',
            'last_name' => 'Sync',
            'email' => 'sync@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $response = $this->withHeaders([
            'X-Attendance-Api-Key' => 'valid-secret-key-xyz',
        ])->postJson('/api/attendance/sync', [
            'employee_id' => $employee->id,
            'date' => '2026-10-23',
            'clock_in' => '08:00',
            'clock_out' => '17:00',
            'status' => 'Present',
            'late_duration_minutes' => 0,
            'overtime_minutes' => 60,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'status' => 'Present',
            'overtime_minutes' => 60,
        ]);
    }

    public function test_attendance_sync_by_super_admin_succeeds(): void
    {
        $adminUser = User::factory()->create();
        $adminUser->assignRole('Super Admin');

        $employeeUser = User::factory()->create();
        $employee = Employee::create([
            'user_id' => $employeeUser->id,
            'employee_number' => 'EMP-SYNC-02',
            'first_name' => 'Jane',
            'last_name' => 'Sync',
            'email' => 'jane@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $response = $this->actingAs($adminUser)->postJson('/api/attendance/sync', [
            'employee_id' => $employee->id,
            'date' => '2026-10-23',
            'clock_in' => '09:15',
            'clock_out' => '17:00',
            'status' => 'Late',
            'late_duration_minutes' => 15,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'status' => 'Late',
            'late_duration_minutes' => 15,
        ]);
    }

    public function test_executable_file_upload_to_documents_is_rejected(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $maliciousFile = UploadedFile::fake()->create('shell.php', 10, 'application/x-php');

        $response = $this->actingAs($admin)->post('/documents', [
            'title' => 'Malicious PHP Shell',
            'type' => 'SOP',
            'file' => $maliciousFile,
        ]);

        $response->assertSessionHasErrors('file');
        Storage::disk('public')->assertMissing('documents/shell.php');
    }

    public function test_executable_file_upload_to_task_attachments_is_rejected(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_number' => 'EMP-ATT-01',
            'first_name' => 'User',
            'last_name' => 'Attach',
            'email' => 'att@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $task = Task::create([
            'title' => 'Sample Task',
            'created_by' => $user->id,
            'priority' => TaskPriority::Normal->value,
            'status' => TaskStatus::ToDo->value,
        ]);

        $maliciousFile = UploadedFile::fake()->create('backdoor.php', 15, 'application/x-php');

        $response = $this->actingAs($user)->post("/tasks/{$task->id}/attachments", [
            'file' => $maliciousFile,
        ]);

        $response->assertSessionHasErrors('file');
    }

    public function test_unauthorized_employee_cannot_upload_attachment_to_restricted_task(): void
    {
        Storage::fake('public');

        // Task owner
        $owner = User::factory()->create();
        $ownerEmployee = Employee::create([
            'user_id' => $owner->id,
            'employee_number' => 'EMP-OWNER',
            'first_name' => 'Task',
            'last_name' => 'Owner',
            'email' => 'owner@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        // Task assignee
        $assignee = User::factory()->create();
        $assigneeEmployee = Employee::create([
            'user_id' => $assignee->id,
            'employee_number' => 'EMP-ASSIGNEE',
            'first_name' => 'Task',
            'last_name' => 'Assignee',
            'email' => 'assignee@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $task = Task::create([
            'title' => 'Confidential Executive Task',
            'created_by' => $owner->id,
            'priority' => TaskPriority::High->value,
            'status' => TaskStatus::InProgress->value,
        ]);
        $task->assignees()->attach($assigneeEmployee->id);

        // Outside unauthorized employee
        $outsider = User::factory()->create();
        Employee::create([
            'user_id' => $outsider->id,
            'employee_number' => 'EMP-OUTSIDER',
            'first_name' => 'External',
            'last_name' => 'Employee',
            'email' => 'outsider@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $docFile = UploadedFile::fake()->create('report.pdf', 50, 'application/pdf');

        $response = $this->actingAs($outsider)->post("/tasks/{$task->id}/attachments", [
            'file' => $docFile,
        ]);

        $response->assertStatus(403);
    }

    public function test_unauthorized_employee_cannot_comment_on_restricted_task(): void
    {
        $owner = User::factory()->create();
        $ownerEmployee = Employee::create([
            'user_id' => $owner->id,
            'employee_number' => 'EMP-OWN-2',
            'first_name' => 'Owner',
            'last_name' => 'Two',
            'email' => 'own2@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $task = Task::create([
            'title' => 'Restricted Financial Audit Task',
            'created_by' => $owner->id,
            'priority' => TaskPriority::Urgent->value,
            'status' => TaskStatus::InProgress->value,
        ]);
        $task->assignees()->attach($ownerEmployee->id);

        $outsider = User::factory()->create();
        Employee::create([
            'user_id' => $outsider->id,
            'employee_number' => 'EMP-OUT-2',
            'first_name' => 'Out',
            'last_name' => 'Two',
            'email' => 'out2@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $response = $this->actingAs($outsider)->post("/tasks/{$task->id}/comments", [
            'content' => 'Attempting unauthorized comment.',
        ]);

        $response->assertStatus(403);
    }

    public function test_department_document_download_is_restricted_to_department_members(): void
    {
        Storage::fake('public');

        $deptHr = Department::create(['name' => 'Human Resources']);
        $deptFnb = Department::create(['name' => 'Food and Beverage']);

        $hrUser = User::factory()->create();
        $hrEmployee = Employee::create([
            'user_id' => $hrUser->id,
            'department_id' => $deptHr->id,
            'employee_number' => 'EMP-HR-01',
            'first_name' => 'HR',
            'last_name' => 'Officer',
            'email' => 'hrofficer@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $fnbUser = User::factory()->create();
        $fnbEmployee = Employee::create([
            'user_id' => $fnbUser->id,
            'department_id' => $deptFnb->id,
            'employee_number' => 'EMP-FNB-01',
            'first_name' => 'Cook',
            'last_name' => 'Chef',
            'email' => 'chef@example.com',
            'hire_date' => now(),
            'status' => 'active',
        ]);

        Storage::disk('public')->put('documents/confidential_hr_payroll.pdf', 'Sensitive Content');

        $document = Document::create([
            'title' => 'HR Confidential Bonus Plan',
            'file_path' => 'documents/confidential_hr_payroll.pdf',
            'type' => 'Payroll Policy',
            'department_id' => $deptHr->id,
            'uploaded_by' => $hrUser->id,
        ]);

        // F&B employee cannot download HR document
        $responseFnb = $this->actingAs($fnbUser)->get("/documents/{$document->id}/download");
        $responseFnb->assertStatus(403);

        // HR employee can download HR document
        $responseHr = $this->actingAs($hrUser)->get("/documents/{$document->id}/download");
        $responseHr->assertStatus(200);
    }

    public function test_unauthorized_user_cannot_manipulate_task_checklists(): void
    {
        $creator = User::factory()->create();
        $creator->assignRole('Staff');
        $creatorEmp = Employee::create([
            'user_id' => $creator->id,
            'employee_number' => 'EMP-CR-01',
            'first_name' => 'Creator',
            'last_name' => 'User',
            'email' => $creator->email,
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $unauthorizedUser = User::factory()->create();
        $unauthorizedUser->assignRole('Staff');
        $unauthEmp = Employee::create([
            'user_id' => $unauthorizedUser->id,
            'employee_number' => 'EMP-UN-01',
            'first_name' => 'Unauthorized',
            'last_name' => 'User',
            'email' => $unauthorizedUser->email,
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $task = Task::create([
            'title' => 'Confidential Task',
            'created_by' => $creator->id,
            'priority' => TaskPriority::High->value,
            'status' => TaskStatus::InProgress->value,
        ]);
        $task->assignees()->attach($creatorEmp->id);

        $checklist = TaskChecklist::create([
            'task_id' => $task->id,
            'title' => 'Initial Checklist Item',
            'is_completed' => false,
        ]);

        // 1. Unauthorized user cannot add checklist item
        $storeResp = $this->actingAs($unauthorizedUser)->post("/tasks/{$task->id}/checklists", [
            'title' => 'Hacked Item',
        ]);
        $storeResp->assertStatus(403);
        $this->assertDatabaseMissing('task_checklists', ['title' => 'Hacked Item']);

        // 2. Unauthorized user cannot update checklist item
        $updateResp = $this->actingAs($unauthorizedUser)->put("/checklists/{$checklist->id}", [
            'is_completed' => true,
        ]);
        $updateResp->assertStatus(403);
        $this->assertFalse((bool) $checklist->fresh()->is_completed);

        // 3. Unauthorized user cannot delete checklist item
        $deleteResp = $this->actingAs($unauthorizedUser)->delete("/checklists/{$checklist->id}");
        $deleteResp->assertStatus(403);
        $this->assertDatabaseHas('task_checklists', ['id' => $checklist->id]);

        // 4. Authorized user (creator/assignee) can update and delete
        $validUpdateResp = $this->actingAs($creator)->put("/checklists/{$checklist->id}", [
            'is_completed' => true,
        ]);
        $validUpdateResp->assertRedirect();
        $this->assertTrue((bool) $checklist->fresh()->is_completed);

        $validDeleteResp = $this->actingAs($creator)->delete("/checklists/{$checklist->id}");
        $validDeleteResp->assertRedirect();
        $this->assertDatabaseMissing('task_checklists', ['id' => $checklist->id]);
    }

    public function test_non_it_ticket_reporter_cannot_arbitrarily_change_ticket_status(): void
    {
        $reporterUser = User::factory()->create();
        $reporterUser->assignRole('Staff');
        $reporterEmp = Employee::create([
            'user_id' => $reporterUser->id,
            'employee_number' => 'EMP-REP-01',
            'first_name' => 'Reporter',
            'last_name' => 'User',
            'email' => $reporterUser->email,
            'hire_date' => now(),
            'status' => 'active',
        ]);

        $ticket = ItTicket::create([
            'ticket_number' => 'IT-202611-0001',
            'reported_by_employee_id' => $reporterEmp->id,
            'title' => 'Printer Issue',
            'description' => 'Cannot print document',
            'category' => 'Hardware',
            'priority' => 'Medium',
            'status' => 'Open',
        ]);

        // Reporter tries to set status to 'In Progress' or 'Resolved' directly -> 403 Forbidden
        $response = $this->actingAs($reporterUser)->patch("/it/tickets/{$ticket->id}/status", [
            'status' => 'In Progress',
        ]);
        $response->assertStatus(403);
        $this->assertSame('Open', $ticket->fresh()->status);

        // Ticket is resolved by IT
        $ticket->update(['status' => 'Resolved']);

        // Reporter can now close the resolved ticket -> 302 redirect
        $closeResponse = $this->actingAs($reporterUser)->patch("/it/tickets/{$ticket->id}/status", [
            'status' => 'Closed',
        ]);
        $closeResponse->assertRedirect();
        $this->assertSame('Closed', $ticket->fresh()->status);
    }

    public function test_system_run_migrations_rejects_get_and_requires_post_by_super_admin(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $staff = User::factory()->create();
        $staff->assignRole('Staff');

        // GET request is rejected with 405 Method Not Allowed
        $getResp = $this->actingAs($admin)->get('/system/run-migrations');
        $getResp->assertStatus(405);

        // POST by non-admin is 403 Forbidden
        $staffPost = $this->actingAs($staff)->post('/system/run-migrations');
        $staffPost->assertStatus(403);

        // POST by Super Admin succeeds
        $adminPost = $this->actingAs($admin)->post('/system/run-migrations');
        $adminPost->assertStatus(200);
        $adminPost->assertJson(['status' => 'success']);
    }
}
