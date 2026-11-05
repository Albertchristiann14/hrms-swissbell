<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AnnouncementCenterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['Staff / Employee', 'Supervisor', 'Head of Department', 'General Manager', 'HRD / Admin', 'Super Admin'] as $name) {
            Role::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }
    }

    private function publish(User $author, string $title, string $audience): Announcement
    {
        return Announcement::create([
            'title' => $title,
            'message' => 'Pengumuman untuk pengujian sistem.',
            'target_audience' => $audience,
            'created_by' => $author->id,
            'published_at' => now(),
        ]);
    }

    public function test_regular_staff_only_receives_announcements_for_all_staff(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $viewer->assignRole('Staff / Employee');

        $general = $this->publish($author, 'Informasi Umum', 'All');
        $this->publish($author, 'Briefing Supervisor', 'Supervisors');

        $this->actingAs($viewer)->get('/announcements')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Announcement/Index')
                ->has('announcements', 1)
                ->where('announcements.0.id', $general->id)
            );
    }

    public function test_supervisor_can_read_all_and_supervisor_announcements(): void
    {
        $author = User::factory()->create();
        $viewer = User::factory()->create();
        $viewer->assignRole('Supervisor');

        $this->publish($author, 'Informasi Umum', 'All');
        $this->publish($author, 'Briefing Supervisor', 'Supervisors');

        $this->actingAs($viewer)->get('/announcements')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Announcement/Index')
                ->has('announcements', 2)
            );
    }

    public function test_regular_staff_cannot_publish_announcements(): void
    {
        $staff = User::factory()->create();
        $staff->assignRole('Staff / Employee');

        $this->actingAs($staff)->post('/announcements', [
            'title' => 'Tidak Diizinkan',
            'message' => 'Pesan uji.',
            'target_audience' => 'All',
        ])->assertForbidden();

        $this->assertDatabaseCount('announcements', 0);
    }
}
