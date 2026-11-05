<?php

namespace Database\Seeders;

use App\Enums\TaskStatus;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\PerformancePeriod;
use App\Models\PerformanceScore;
use App\Models\Position;
use App\Models\Project;
use App\Models\SupervisorAssessment;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\TaskComment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database with realistic Swiss-Belhotel data.
     */
    public function run(): void
    {
        $this->call(RoleAndPermissionSeeder::class);
        $this->call(RoomAndSecuritySeeder::class);

        // ─── DEPARTMENTS ───
        $departments = [
            ['name' => 'Front Office', 'description' => 'Mengelola penerimaan tamu, reservasi, dan layanan concierge.'],
            ['name' => 'Housekeeping', 'description' => 'Bertanggung jawab atas kebersihan dan kenyamanan kamar serta area hotel.'],
            ['name' => 'Food & Beverage', 'description' => 'Mengelola restoran, bar, banquet, dan room service.'],
            ['name' => 'Engineering', 'description' => 'Pemeliharaan fasilitas, peralatan, dan infrastruktur hotel.'],
            ['name' => 'Accounting', 'description' => 'Mengelola keuangan, pembukuan, dan laporan keuangan hotel.'],
            ['name' => 'Sales & Marketing', 'description' => 'Pemasaran hotel, penjualan ruang meeting, dan kerja sama event.'],
            ['name' => 'IT', 'description' => 'Pengelolaan sistem teknologi informasi dan infrastruktur digital.'],
        ];

        $deptModels = [];
        foreach ($departments as $dept) {
            $deptModels[$dept['name']] = Department::create($dept);
        }

        // ─── POSITIONS ───
        $positionMap = [
            'Front Office' => ['Front Office Manager', 'Supervisor Front Office', 'Receptionist', 'Bellboy'],
            'Housekeeping' => ['Executive Housekeeper', 'Housekeeping Supervisor', 'Room Attendant'],
            'Food & Beverage' => ['F&B Manager', 'F&B Supervisor', 'Waiter/Waitress', 'Cook'],
            'Engineering' => ['Chief Engineer', 'Engineering Supervisor', 'Technician'],
            'Accounting' => ['Accounting Manager', 'Accounting Supervisor', 'Accounting Staff'],
            'Sales & Marketing' => ['Sales & Marketing Manager', 'Sales Executive', 'Marketing Staff'],
            'IT' => ['IT Manager', 'IT Support Staff'],
        ];

        $posModels = [];
        foreach ($positionMap as $deptName => $positions) {
            foreach ($positions as $posName) {
                $posModels[$posName] = Position::create([
                    'name' => $posName,
                    'department_id' => $deptModels[$deptName]->id,
                ]);
            }
        }

        // ─── EMPLOYEES ───
        // Helper to create employee
        $createEmployee = function (string $name, string $email, string $empNum, string $deptName, string $posName, string $role, ?int $supervisorId = null, string $status = 'Active') use ($deptModels, $posModels) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('password'),
            ]);
            $user->assignRole($role);

            return Employee::create([
                'user_id' => $user->id,
                'employee_number' => $empNum,
                'department_id' => $deptModels[$deptName]->id,
                'position_id' => $posModels[$posName]->id,
                'supervisor_id' => $supervisorId,
                'join_date' => Carbon::now()->subMonths(rand(6, 48)),
                'employment_status' => $status,
                'phone_number' => '08' . rand(1000000000, 9999999999),
            ]);
        };

        // Super Admin (IT) — already created in RoleAndPermissionSeeder, add employee record
        $adminUser = User::where('email', 'admin@swissbelhotel.com')->firstOrFail();

        $adminEmployee = Employee::updateOrCreate(
            ['user_id' => $adminUser->id],
            [
                'employee_number' => 'SBH-001',
                'department_id' => $deptModels['IT']->id,
                'position_id' => $posModels['IT Manager']->id,
                'join_date' => Carbon::now()->subYears(5),
                'employment_status' => 'Active',
                'phone_number' => '081234567890',
            ]
        );

        // === START OF DUMMY DATA (COMMENTED OUT FOR CLEAN SLATE) ===
        // General Manager
        $gm = $createEmployee('Ahmad Rizky Pratama', 'gm@swissbelhotel.com', 'SBH-002', 'Front Office', 'Front Office Manager', 'General Manager');

        // HRD
        $hrd = $createEmployee('Siti Nurhaliza', 'hrd@swissbelhotel.com', 'SBH-003', 'Accounting', 'Accounting Manager', 'HRD / Admin', $gm->id);

        // ── Department Heads (Head of Department role) ──
        $hodFO = $createEmployee('Budi Santoso', 'fo.head@swissbelhotel.com', 'SBH-010', 'Front Office', 'Front Office Manager', 'Head of Department', $gm->id);
        $hodHK = $createEmployee('Dewi Kartika', 'hk.head@swissbelhotel.com', 'SBH-011', 'Housekeeping', 'Executive Housekeeper', 'Head of Department', $gm->id);
        $hodFB = $createEmployee('Rudi Hermawan', 'fb.head@swissbelhotel.com', 'SBH-012', 'Food & Beverage', 'F&B Manager', 'Head of Department', $gm->id);
        $hodEng = $createEmployee('Agus Setiawan', 'eng.head@swissbelhotel.com', 'SBH-013', 'Engineering', 'Chief Engineer', 'Head of Department', $gm->id);
        $hodAcc = $createEmployee('Rina Wulandari', 'acc.head@swissbelhotel.com', 'SBH-014', 'Accounting', 'Accounting Manager', 'Head of Department', $gm->id);
        $hodSM = $createEmployee('Dian Permata', 'sm.head@swissbelhotel.com', 'SBH-015', 'Sales & Marketing', 'Sales & Marketing Manager', 'Head of Department', $gm->id);

        // ── Supervisors ──
        $supFO = $createEmployee('Fajar Nugroho', 'fo.sup@swissbelhotel.com', 'SBH-020', 'Front Office', 'Supervisor Front Office', 'Supervisor', $hodFO->id);
        $supHK = $createEmployee('Lestari Putri', 'hk.sup@swissbelhotel.com', 'SBH-021', 'Housekeeping', 'Housekeeping Supervisor', 'Supervisor', $hodHK->id);
        $supFB = $createEmployee('Wahyu Prasetyo', 'fb.sup@swissbelhotel.com', 'SBH-022', 'Food & Beverage', 'F&B Supervisor', 'Supervisor', $hodFB->id);
        $supEng = $createEmployee('Hendra Gunawan', 'eng.sup@swissbelhotel.com', 'SBH-023', 'Engineering', 'Engineering Supervisor', 'Supervisor', $hodEng->id);
        $supAcc = $createEmployee('Maya Sari', 'acc.sup@swissbelhotel.com', 'SBH-024', 'Accounting', 'Accounting Supervisor', 'Supervisor', $hodAcc->id);

        // ── Staff / Employees ──
        // Front Office Staff
        $staffFO1 = $createEmployee('Andi Firmansyah', 'andi.fo@swissbelhotel.com', 'SBH-100', 'Front Office', 'Receptionist', 'Staff / Employee', $supFO->id);
        $staffFO2 = $createEmployee('Putri Amelia', 'putri.fo@swissbelhotel.com', 'SBH-101', 'Front Office', 'Receptionist', 'Staff / Employee', $supFO->id);
        $staffFO3 = $createEmployee('Rizal Fadillah', 'rizal.fo@swissbelhotel.com', 'SBH-102', 'Front Office', 'Bellboy', 'Staff / Employee', $supFO->id);

        // Housekeeping Staff
        $staffHK1 = $createEmployee('Yuni Rahayu', 'yuni.hk@swissbelhotel.com', 'SBH-110', 'Housekeeping', 'Room Attendant', 'Staff / Employee', $supHK->id);
        $staffHK2 = $createEmployee('Tono Sugiarto', 'tono.hk@swissbelhotel.com', 'SBH-111', 'Housekeeping', 'Room Attendant', 'Staff / Employee', $supHK->id);
        $staffHK3 = $createEmployee('Sari Dewi', 'sari.hk@swissbelhotel.com', 'SBH-112', 'Housekeeping', 'Room Attendant', 'Staff / Employee', $supHK->id);

        // F&B Staff
        $staffFB1 = $createEmployee('Deni Kurniawan', 'deni.fb@swissbelhotel.com', 'SBH-120', 'Food & Beverage', 'Waiter/Waitress', 'Staff / Employee', $supFB->id);
        $staffFB2 = $createEmployee('Nita Puspita', 'nita.fb@swissbelhotel.com', 'SBH-121', 'Food & Beverage', 'Waiter/Waitress', 'Staff / Employee', $supFB->id);
        $staffFB3 = $createEmployee('Bambang Kusumo', 'bambang.fb@swissbelhotel.com', 'SBH-122', 'Food & Beverage', 'Cook', 'Staff / Employee', $supFB->id);

        // Engineering Staff
        $staffEng1 = $createEmployee('Eko Prasetya', 'eko.eng@swissbelhotel.com', 'SBH-130', 'Engineering', 'Technician', 'Staff / Employee', $supEng->id);
        $staffEng2 = $createEmployee('Irwan Hidayat', 'irwan.eng@swissbelhotel.com', 'SBH-131', 'Engineering', 'Technician', 'Staff / Employee', $supEng->id);

        // Accounting Staff
        $staffAcc1 = $createEmployee('Linda Permatasari', 'linda.acc@swissbelhotel.com', 'SBH-140', 'Accounting', 'Accounting Staff', 'Staff / Employee', $supAcc->id);
        $staffAcc2 = $createEmployee('Joko Widodo', 'joko.acc@swissbelhotel.com', 'SBH-141', 'Accounting', 'Accounting Staff', 'Staff / Employee', $supAcc->id);

        // Sales & Marketing Staff
        $staffSM1 = $createEmployee('Mega Lestari', 'mega.sm@swissbelhotel.com', 'SBH-150', 'Sales & Marketing', 'Sales Executive', 'Staff / Employee', $hodSM->id);
        $staffSM2 = $createEmployee('Arief Rahman', 'arief.sm@swissbelhotel.com', 'SBH-151', 'Sales & Marketing', 'Marketing Staff', 'Staff / Employee', $hodSM->id);

        // IT Staff
        $staffIT1 = $createEmployee('Kevin Anggara', 'kevin.it@swissbelhotel.com', 'SBH-160', 'IT', 'IT Support Staff', 'Staff / Employee', $adminEmployee->id);

        // ─── PROJECTS ───
        $project1 = Project::create([
            'name' => 'Persiapan Event Wedding September',
            'description' => 'Mempersiapkan seluruh kebutuhan event wedding besar di Grand Ballroom untuk tanggal 27 September 2026, termasuk dekorasi, catering, sound system, dan koordinasi tim.',
            'owner_id' => $hodFB->id,
            'department_id' => $deptModels['Food & Beverage']->id,
            'start_date' => Carbon::now()->subDays(14),
            'deadline' => Carbon::parse('2026-09-27'),
            'status' => 'Active',
            'progress' => 65,
            'created_by' => $hodFB->user_id,
        ]);
        $project1->members()->attach([$hodFB->id, $supFB->id, $staffFB1->id, $staffFB2->id, $staffFB3->id, $staffEng1->id, $staffHK1->id]);

        $project2 = Project::create([
            'name' => 'Renovasi Lobby & Reception Area',
            'description' => 'Proyek renovasi area lobby dan reception hotel untuk meningkatkan kesan pertama tamu. Meliputi cat ulang, penataan furniture, dan upgrade signage.',
            'owner_id' => $hodEng->id,
            'department_id' => $deptModels['Engineering']->id,
            'start_date' => Carbon::now()->subDays(30),
            'deadline' => Carbon::now()->addDays(45),
            'status' => 'Active',
            'progress' => 40,
            'created_by' => $gm->user_id,
        ]);
        $project2->members()->attach([$hodEng->id, $supEng->id, $staffEng1->id, $staffEng2->id, $staffHK2->id]);

        $project3 = Project::create([
            'name' => 'Upgrade Sistem IT & Network',
            'description' => 'Upgrade infrastruktur jaringan WiFi hotel, penggantian router, dan implementasi sistem monitoring jaringan baru.',
            'owner_id' => $adminEmployee->id,
            'department_id' => $deptModels['IT']->id,
            'start_date' => Carbon::now()->subDays(7),
            'deadline' => Carbon::now()->addDays(21),
            'status' => 'Active',
            'progress' => 25,
            'created_by' => $adminEmployee->user_id,
        ]);
        $project3->members()->attach([$adminEmployee->id, $staffIT1->id, $staffEng1->id]);

        $project4 = Project::create([
            'name' => 'Audit Keuangan Q3 2026',
            'description' => 'Penyusunan laporan keuangan kuartal 3 tahun 2026 dan persiapan audit internal.',
            'owner_id' => $hodAcc->id,
            'department_id' => $deptModels['Accounting']->id,
            'start_date' => Carbon::now()->subDays(5),
            'deadline' => Carbon::now()->addDays(25),
            'status' => 'Planning',
            'progress' => 10,
            'created_by' => $hodAcc->user_id,
        ]);
        $project4->members()->attach([$hodAcc->id, $supAcc->id, $staffAcc1->id, $staffAcc2->id]);

        $project5 = Project::create([
            'name' => 'Kampanye Promosi Akhir Tahun',
            'description' => 'Perencanaan dan pelaksanaan kampanye promosi paket liburan akhir tahun melalui media sosial, travel agent, dan corporate partnership.',
            'owner_id' => $hodSM->id,
            'department_id' => $deptModels['Sales & Marketing']->id,
            'start_date' => Carbon::now()->subDays(3),
            'deadline' => Carbon::parse('2026-12-15'),
            'status' => 'Planning',
            'progress' => 5,
            'created_by' => $hodSM->user_id,
        ]);
        $project5->members()->attach([$hodSM->id, $staffSM1->id, $staffSM2->id]);

        $project6 = Project::create([
            'name' => 'Training Staff Baru Agustus',
            'description' => 'Program pelatihan karyawan baru batch Agustus 2026 meliputi SOP hotel, customer service, dan safety drill.',
            'owner_id' => $hrd->id,
            'department_id' => $deptModels['Accounting']->id,
            'start_date' => Carbon::now()->subMonths(1),
            'deadline' => Carbon::now()->subDays(5),
            'status' => 'Completed',
            'progress' => 100,
            'created_by' => $hrd->user_id,
        ]);
        $project6->members()->attach([$hrd->id, $supFO->id, $supHK->id]);

        // ─── TASKS ───
        $tasksData = [
            // Project 1 - Wedding
            [
                'title' => 'Setup Ballroom Layout',
                'description' => 'Menata layout ballroom sesuai denah yang disetujui oleh klien wedding, termasuk meja tamu, panggung, dan jalur masuk.',
                'project_id' => $project1->id,
                'created_by' => $hodFB->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(10),
                'status' => 'In Progress',
                'assignees' => [$staffFB1->id, $staffFB2->id],
            ],
            [
                'title' => 'Testing Sound System',
                'description' => 'Cek dan testing seluruh peralatan sound system di Grand Ballroom. Pastikan semua speaker, mic wireless, dan mixer berfungsi.',
                'project_id' => $project1->id,
                'created_by' => $hodFB->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(12),
                'status' => 'To Do',
                'assignees' => [$staffEng1->id],
            ],
            [
                'title' => 'Persiapan Menu Catering',
                'description' => 'Koordinasi dengan kitchen untuk finalisasi menu catering wedding: appetizer, main course, dessert, dan minuman.',
                'project_id' => $project1->id,
                'created_by' => $supFB->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::now()->addDays(5),
                'status' => 'Review',
                'assignees' => [$staffFB3->id],
            ],
            [
                'title' => 'Dekorasi Meja Tamu',
                'description' => 'Menyiapkan dan menata centerpiece, rangkaian bunga, dan taplak meja untuk 40 meja tamu.',
                'project_id' => $project1->id,
                'created_by' => $supFB->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(15),
                'status' => 'To Do',
                'assignees' => [$staffFB1->id, $staffHK1->id],
            ],
            [
                'title' => 'Checking Lighting Ballroom',
                'description' => 'Verifikasi semua lighting di ballroom: spotlight panggung, ambient lighting, dan emergency light.',
                'project_id' => $project1->id,
                'created_by' => $hodFB->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(14),
                'status' => 'To Do',
                'assignees' => [$staffEng1->id],
            ],
            [
                'title' => 'Setup Guest Registration Area',
                'description' => 'Menyiapkan area registrasi tamu di depan ballroom: meja, buku tamu, souvenir.',
                'project_id' => $project1->id,
                'created_by' => $supFB->user_id,
                'priority' => 'Low',
                'deadline' => Carbon::now()->addDays(16),
                'status' => 'To Do',
                'assignees' => [$staffFO1->id],
            ],
            [
                'title' => 'Final Rehearsal',
                'description' => 'Pelaksanaan rehearsal akhir bersama seluruh tim dan pengantin. Pastikan semua elemen berjalan lancar.',
                'project_id' => $project1->id,
                'created_by' => $hodFB->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::parse('2026-09-26'),
                'status' => 'To Do',
                'assignees' => [$supFB->id, $staffFB1->id, $staffFB2->id, $staffEng1->id],
            ],

            // Project 2 - Renovasi Lobby
            [
                'title' => 'Survey dan Pengukuran Lobby',
                'description' => 'Melakukan survey dan pengukuran ulang area lobby untuk perencanaan renovasi.',
                'project_id' => $project2->id,
                'created_by' => $hodEng->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->subDays(5),
                'status' => 'Done',
                'assignees' => [$staffEng1->id, $staffEng2->id],
            ],
            [
                'title' => 'Pengadaan Material Cat & Furniture',
                'description' => 'Pembelian material renovasi: cat interior, wallpaper, dan furniture lounge baru.',
                'project_id' => $project2->id,
                'created_by' => $supEng->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(3),
                'status' => 'In Progress',
                'assignees' => [$staffEng2->id],
            ],
            [
                'title' => 'Pengecatan Dinding Lobby',
                'description' => 'Pengecatan ulang seluruh dinding area lobby dengan warna baru sesuai konsep.',
                'project_id' => $project2->id,
                'created_by' => $supEng->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(20),
                'status' => 'To Do',
                'assignees' => [$staffEng1->id],
            ],
            [
                'title' => 'Penataan Furniture Baru',
                'description' => 'Menata sofa, meja, dan dekorasi baru di area lobby reception.',
                'project_id' => $project2->id,
                'created_by' => $hodEng->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(30),
                'status' => 'To Do',
                'assignees' => [$staffEng1->id, $staffHK2->id],
            ],
            [
                'title' => 'Deep Cleaning Area Renovasi',
                'description' => 'Pembersihan menyeluruh area lobby setelah proses renovasi selesai.',
                'project_id' => $project2->id,
                'created_by' => $supEng->user_id,
                'priority' => 'Low',
                'deadline' => Carbon::now()->addDays(40),
                'status' => 'To Do',
                'assignees' => [$staffHK2->id],
            ],

            // Project 3 - IT Upgrade
            [
                'title' => 'Audit Jaringan Existing',
                'description' => 'Melakukan audit jaringan WiFi dan LAN yang ada di seluruh lantai hotel. Identifikasi dead spots dan bottleneck.',
                'project_id' => $project3->id,
                'created_by' => $adminEmployee->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::now()->addDays(2),
                'status' => 'Review',
                'assignees' => [$staffIT1->id],
            ],
            [
                'title' => 'Pengadaan Router & Access Point',
                'description' => 'Procurement 15 unit access point baru dan 2 core router untuk upgrade jaringan.',
                'project_id' => $project3->id,
                'created_by' => $adminEmployee->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(7),
                'status' => 'In Progress',
                'assignees' => [$staffIT1->id],
            ],
            [
                'title' => 'Instalasi Access Point Lantai 1-5',
                'description' => 'Pemasangan access point baru di setiap lantai hotel.',
                'project_id' => $project3->id,
                'created_by' => $adminEmployee->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(15),
                'status' => 'To Do',
                'assignees' => [$staffIT1->id, $staffEng1->id],
            ],
            [
                'title' => 'Konfigurasi Network Monitoring',
                'description' => 'Setup sistem monitoring jaringan (SNMP) untuk alerting ketika ada gangguan.',
                'project_id' => $project3->id,
                'created_by' => $adminEmployee->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(18),
                'status' => 'To Do',
                'assignees' => [$staffIT1->id],
            ],

            // Project 4 - Audit Keuangan
            [
                'title' => 'Rekonsiliasi Bank Statement',
                'description' => 'Mencocokkan seluruh transaksi bank statement periode Juli-September 2026.',
                'project_id' => $project4->id,
                'created_by' => $hodAcc->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::now()->addDays(8),
                'status' => 'In Progress',
                'assignees' => [$staffAcc1->id],
            ],
            [
                'title' => 'Penyusunan Laporan Revenue',
                'description' => 'Menyusun laporan revenue per department (room, F&B, banquet) untuk Q3.',
                'project_id' => $project4->id,
                'created_by' => $supAcc->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(12),
                'status' => 'To Do',
                'assignees' => [$staffAcc1->id, $staffAcc2->id],
            ],
            [
                'title' => 'Verifikasi Expense Report',
                'description' => 'Memverifikasi seluruh bukti pengeluaran operasional Q3 2026.',
                'project_id' => $project4->id,
                'created_by' => $supAcc->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(15),
                'status' => 'To Do',
                'assignees' => [$staffAcc2->id],
            ],
            [
                'title' => 'Persiapan Dokumen Audit',
                'description' => 'Menyiapkan seluruh dokumen pendukung untuk proses audit internal.',
                'project_id' => $project4->id,
                'created_by' => $hodAcc->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(20),
                'status' => 'To Do',
                'assignees' => [$supAcc->id, $staffAcc1->id],
            ],

            // Project 5 - Kampanye
            [
                'title' => 'Desain Materi Promosi',
                'description' => 'Membuat desain flyer, banner digital, dan posting media sosial untuk kampanye akhir tahun.',
                'project_id' => $project5->id,
                'created_by' => $hodSM->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(14),
                'status' => 'In Progress',
                'assignees' => [$staffSM2->id],
            ],
            [
                'title' => 'Negosiasi Travel Agent Partner',
                'description' => 'Menghubungi dan negosiasi partnership dengan 10 travel agent untuk paket promo.',
                'project_id' => $project5->id,
                'created_by' => $hodSM->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(21),
                'status' => 'To Do',
                'assignees' => [$staffSM1->id],
            ],
            [
                'title' => 'Setup Landing Page Promo',
                'description' => 'Membuat landing page khusus promo akhir tahun di website hotel.',
                'project_id' => $project5->id,
                'created_by' => $hodSM->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(28),
                'status' => 'To Do',
                'assignees' => [$staffSM2->id, $staffIT1->id],
            ],

            // Project 6 - Training (Completed)
            [
                'title' => 'Materi Training SOP Hotel',
                'description' => 'Menyiapkan materi pelatihan SOP operasional hotel untuk staff baru.',
                'project_id' => $project6->id,
                'created_by' => $hrd->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->subDays(20),
                'status' => 'Done',
                'assignees' => [$supFO->id],
            ],
            [
                'title' => 'Training Customer Service',
                'description' => 'Pelaksanaan training customer service excellence untuk seluruh staff baru.',
                'project_id' => $project6->id,
                'created_by' => $hrd->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->subDays(12),
                'status' => 'Done',
                'assignees' => [$supFO->id, $supHK->id],
            ],
            [
                'title' => 'Safety & Emergency Drill',
                'description' => 'Latihan evakuasi dan pengenalan prosedur keselamatan kerja.',
                'project_id' => $project6->id,
                'created_by' => $hrd->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::now()->subDays(8),
                'status' => 'Done',
                'assignees' => [$supEng->id],
            ],
            [
                'title' => 'Evaluasi Hasil Training',
                'description' => 'Membuat laporan evaluasi hasil training berdasarkan tes dan observasi.',
                'project_id' => $project6->id,
                'created_by' => $hrd->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->subDays(5),
                'status' => 'Done',
                'assignees' => [$hrd->id],
            ],

            // Additional standalone-ish tasks with various statuses
            [
                'title' => 'Perbaikan AC Lantai 3',
                'description' => 'AC kamar 301-305 tidak dingin. Perlu pengecekan dan perbaikan.',
                'project_id' => $project2->id,
                'created_by' => $hodEng->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::now()->subDays(2),
                'status' => 'In Progress',
                'assignees' => [$staffEng2->id],
            ],
            [
                'title' => 'Update SOP Housekeeping',
                'description' => 'Revisi SOP housekeeping terkait protokol pembersihan kamar checkout.',
                'project_id' => $project6->id,
                'created_by' => $hodHK->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(7),
                'status' => 'Review',
                'assignees' => [$supHK->id],
            ],
            [
                'title' => 'Laporan Occupancy Agustus',
                'description' => 'Menyusun laporan tingkat hunian kamar bulan Agustus 2026.',
                'project_id' => $project4->id,
                'created_by' => $supAcc->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->subDays(3),
                'status' => 'Done',
                'assignees' => [$staffAcc1->id],
            ],
            [
                'title' => 'Inventarisasi Linen & Towel',
                'description' => 'Stock opname seluruh linen, towel, dan bed cover hotel.',
                'project_id' => $project2->id,
                'created_by' => $supHK->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(5),
                'status' => 'In Progress',
                'assignees' => [$staffHK1->id, $staffHK3->id],
            ],
            [
                'title' => 'Backup Database Server',
                'description' => 'Melakukan full backup database server hotel dan verifikasi integritas backup.',
                'project_id' => $project3->id,
                'created_by' => $adminEmployee->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(1),
                'status' => 'To Do',
                'assignees' => [$staffIT1->id],
            ],
            [
                'title' => 'Penggantian Kunci Kamar 208',
                'description' => 'Kunci kartu kamar 208 sering error. Perlu penggantian card reader.',
                'project_id' => $project2->id,
                'created_by' => $supEng->user_id,
                'priority' => 'Urgent',
                'deadline' => Carbon::now(),
                'status' => 'Blocked',
                'assignees' => [$staffEng2->id],
            ],
            [
                'title' => 'Meeting Koordinasi Bulanan',
                'description' => 'Persiapan agenda dan notulensi meeting koordinasi antar department bulanan.',
                'project_id' => $project6->id,
                'created_by' => $hrd->user_id,
                'priority' => 'Normal',
                'deadline' => Carbon::now()->addDays(2),
                'status' => 'To Do',
                'assignees' => [$hrd->id],
            ],
            [
                'title' => 'Cek Stok Mini Bar',
                'description' => 'Audit stok mini bar seluruh kamar VIP (lantai 7-8).',
                'project_id' => $project1->id,
                'created_by' => $supFB->user_id,
                'priority' => 'Low',
                'deadline' => Carbon::now()->addDays(4),
                'status' => 'To Do',
                'assignees' => [$staffFB2->id],
            ],
            [
                'title' => 'Follow Up Corporate Client',
                'description' => 'Follow up proposal kerjasama dengan 5 perusahaan untuk corporate rate Q4.',
                'project_id' => $project5->id,
                'created_by' => $hodSM->user_id,
                'priority' => 'High',
                'deadline' => Carbon::now()->addDays(3),
                'status' => 'In Progress',
                'assignees' => [$staffSM1->id],
            ],
        ];

        $createdTasks = [];
        foreach ($tasksData as $taskData) {
            $assignees = $taskData['assignees'];
            unset($taskData['assignees']);

            $task = Task::create($taskData);
            app(\App\Services\TaskAssignmentHistoryService::class)->sync($task, $assignees, $task->created_by);

            // Acknowledge assigned tasks (simulate some acknowledged)
            if (in_array($task->status->value, ['In Progress', 'Review', 'Done'], true)) {
                foreach ($assignees as $assigneeId) {
                    app(\App\Services\TaskAssignmentHistoryService::class)->acknowledge(
                        $task,
                        \App\Models\Employee::findOrFail($assigneeId),
                        Carbon::now()->subDays(rand(1, 10))
                    );
                }
            }

            $createdTasks[] = $task;
        }

        // ─── TASK COMMENTS ───
        $commentData = [
            [$createdTasks[0], $supFB->id, 'Layout sudah disetujui klien. Pastikan jarak antar meja minimal 1.5 meter ya.'],
            [$createdTasks[0], $staffFB1->id, 'Baik Pak, saya akan ukur ulang nanti sore setelah ballroom kosong.'],
            [$createdTasks[2], $staffFB3->id, 'Menu appetizer dan main course sudah finalisasi, Pak. Tinggal dessert yang masih menunggu konfirmasi dari klien.'],
            [$createdTasks[2], $supFB->id, 'Oke, tolong hubungi WO-nya untuk konfirmasi dessert paling lambat besok ya.'],
            [$createdTasks[7], $staffEng1->id, 'Survey lantai 1 sudah selesai. Dead spot ditemukan di area lift dan koridor sebelah barat.'],
            [$createdTasks[7], $hodEng->user_id === $hodEng->user_id ? $staffEng2->id : $staffEng2->id, 'Lantai 2-3 juga sudah selesai. Dimensi kolom dan jendela sudah dicatat.'],
            [$createdTasks[12], $staffIT1->id, 'Hasil audit: 23 access point terpasang, 5 di antaranya sudah usang (model 2019). Coverage area lobby lemah.'],
            [$createdTasks[12], $adminEmployee->id, 'Good. Tolong buat mapping coverage per lantai dan rekomendasi penempatan AP baru di laporan.'],
            [$createdTasks[16], $staffAcc1->id, 'Rekonsiliasi Juli sudah selesai, selisih Rp 250.000 sudah teridentifikasi dari transaksi kartu kredit. Agustus masih proses.'],
            [$createdTasks[16], $supAcc->id, 'Terima kasih. Untuk selisih tersebut tolong buatkan jurnal koreksi ya.'],
            [$createdTasks[27], $staffEng2->id, 'AC sudah dicek. Masalah di kompresor unit outdoor. Perlu panggil vendor untuk spare part.'],
            [$createdTasks[27], $supEng->id, 'Berapa estimasi biayanya? Tolong minta quotation dari vendor.'],
            [$createdTasks[31], $staffEng2->id, 'Card reader sudah dipesan tapi stok supplier habis. Estimasi datang 3 hari lagi.'],
        ];

        foreach ($commentData as $comment) {
            TaskComment::create([
                'task_id' => $comment[0]->id,
                'employee_id' => $comment[1],
                'content' => $comment[2],
            ]);
        }

        // ─── TASK ACTIVITIES ───
        foreach ($createdTasks as $task) {
            // Creation activity
            TaskActivity::create([
                'task_id' => $task->id,
                'employee_id' => Employee::where('user_id', $task->created_by)->first()?->id ?? $adminEmployee->id,
                'action' => 'created',
                'description' => 'Task created',
            ]);

            $statusRaw = $task->status instanceof TaskStatus ? $task->status->value : $task->status;
            if ($statusRaw !== 'To Do') {
                $statusValue = $task->status instanceof TaskStatus ? $task->status->value : $task->status;
                TaskActivity::create([
                    'task_id' => $task->id,
                    'employee_id' => $task->assignees()->first()?->id ?? $adminEmployee->id,
                    'action' => 'status_changed',
                    'description' => 'Status changed from To Do to ' . $statusValue,
                    'old_value' => ['status' => 'To Do'],
                    'new_value' => ['status' => $statusValue],
                ]);
            }
        }

        // ─── ATTENDANCE DATA ───
        $allEmployees = Employee::all();
        $startOfMonth = Carbon::now()->startOfMonth();
        $today = Carbon::now();

        foreach ($allEmployees as $employee) {
            for ($date = $startOfMonth->copy(); $date->lte($today); $date->addDay()) {
                if ($date->isWeekend()) {
                    Attendance::create([
                        'employee_id' => $employee->id,
                        'date' => $date->format('Y-m-d'),
                        'status' => 'Off',
                        'source' => 'System',
                    ]);
                } else {
                    $rand = rand(1, 100);
                    if ($rand <= 5) {
                        // 5% absent
                        Attendance::create([
                            'employee_id' => $employee->id,
                            'date' => $date->format('Y-m-d'),
                            'status' => 'Absent',
                            'source' => 'Fingerprint',
                        ]);
                    } elseif ($rand <= 20) {
                        // 15% late
                        $lateMinutes = rand(5, 45);
                        Attendance::create([
                            'employee_id' => $employee->id,
                            'date' => $date->format('Y-m-d'),
                            'clock_in' => '09:' . str_pad($lateMinutes, 2, '0', STR_PAD_LEFT),
                            'clock_out' => '17:' . str_pad(rand(0, 30), 2, '0', STR_PAD_LEFT),
                            'status' => 'Late',
                            'late_duration_minutes' => $lateMinutes,
                            'source' => 'Fingerprint',
                        ]);
                    } else {
                        // 80% on time
                        $overtime = rand(1, 10) > 8 ? rand(30, 120) : 0;
                        $clockOut = $overtime > 0 ? '18:' . str_pad(rand(0, 59), 2, '0', STR_PAD_LEFT) : '17:' . str_pad(rand(0, 15), 2, '0', STR_PAD_LEFT);
                        Attendance::create([
                            'employee_id' => $employee->id,
                            'date' => $date->format('Y-m-d'),
                            'clock_in' => '08:' . str_pad(rand(40, 59), 2, '0', STR_PAD_LEFT),
                            'clock_out' => $clockOut,
                            'status' => 'Present',
                            'overtime_minutes' => $overtime,
                            'source' => 'Fingerprint',
                        ]);
                    }
                }
            }
        }

        // ─── ANNOUNCEMENTS ───
        $gmUser = User::where('email', 'gm@swissbelhotel.com')->first();
        $hrdUser = User::where('email', 'hrd@swissbelhotel.com')->first();

        Announcement::create([
            'title' => 'General Meeting September 2026',
            'message' => 'Kepada seluruh karyawan Swiss-Belhotel SKA Pekanbaru, diwajibkan menghadiri General Meeting yang akan dilaksanakan pada hari Jumat, 12 September 2026 pukul 14:00 WIB di Grand Ballroom. Agenda: evaluasi performa Q3 dan rencana program akhir tahun.',
            'target_audience' => 'All',
            'created_by' => $gmUser->id ?? $adminUser->id,
            'published_at' => Carbon::now()->subDays(2),
        ]);

        Announcement::create([
            'title' => 'Jadwal Cuti Bersama Akhir Tahun 2026',
            'message' => 'Informasi jadwal cuti bersama akhir tahun 2026: 24-26 Desember dan 31 Desember - 1 Januari 2027. Karyawan yang bertugas shift pada tanggal tersebut akan mendapatkan kompensasi sesuai kebijakan. Silakan koordinasi dengan HoD masing-masing.',
            'target_audience' => 'All',
            'created_by' => $hrdUser->id ?? $adminUser->id,
            'published_at' => Carbon::now()->subDays(1),
        ]);

        Announcement::create([
            'title' => 'Reminder: Update Data Karyawan',
            'message' => 'Kepada seluruh karyawan, mohon untuk memperbarui data pribadi (alamat, nomor kontak darurat, dan rekening bank) melalui sistem HRD paling lambat tanggal 15 September 2026.',
            'target_audience' => 'All',
            'created_by' => $hrdUser->id ?? $adminUser->id,
            'published_at' => Carbon::now(),
        ]);

        // ─── PERFORMANCE DATA ───
        $period = PerformancePeriod::create([
            'name' => 'Agustus 2026',
            'start_date' => Carbon::parse('2026-08-01'),
            'end_date' => Carbon::parse('2026-08-31'),
            'type' => 'Monthly',
        ]);

        // Create performance scores for staff employees
        $staffEmployees = Employee::whereHas('user', function ($q) {
            $q->whereHas('roles', function ($r) {
                $r->where('name', 'Staff / Employee');
            });
        })->get();

        foreach ($staffEmployees as $staffEmp) {
            $assigned = rand(8, 20);
            $completed = rand(intval($assigned * 0.6), $assigned);
            $onTime = rand(intval($completed * 0.7), $completed);
            $overdue = $assigned - $completed > 0 ? rand(0, $assigned - $completed) : 0;

            $completionRate = $assigned > 0 ? round(($completed / $assigned) * 100, 2) : 0;
            $onTimeRate = $completed > 0 ? round(($onTime / $completed) * 100, 2) : 0;
            $taskWeightScore = round(rand(60, 95), 2);

            // Supervisor assessment
            $supervisorId = $staffEmp->supervisor_id ?? $adminEmployee->id;
            $workQuality = rand(3, 5);
            $accuracy = rand(3, 5);
            $responsibility = rand(3, 5);
            $communication = rand(3, 5);

            SupervisorAssessment::create([
                'employee_id' => $staffEmp->id,
                'supervisor_id' => $supervisorId,
                'performance_period_id' => $period->id,
                'work_quality' => $workQuality,
                'accuracy' => $accuracy,
                'responsibility' => $responsibility,
                'communication' => $communication,
                'notes' => 'Evaluasi performa bulan Agustus 2026.',
            ]);

            $avgAssessment = ($workQuality + $accuracy + $responsibility + $communication) / 4;
            $supervisorScore = round(($avgAssessment / 5) * 100, 2);

            $finalEpi = round(
                ($completionRate * 0.30) +
                    ($onTimeRate * 0.25) +
                    ($taskWeightScore * 0.15) +
                    ($supervisorScore * 0.30),
                2
            );

            $category = match (true) {
                $finalEpi >= 90 => 'Excellent',
                $finalEpi >= 80 => 'Very Good',
                $finalEpi >= 70 => 'Good',
                $finalEpi >= 60 => 'Needs Improvement',
                default => 'Evaluation Required',
            };

            PerformanceScore::create([
                'employee_id' => $staffEmp->id,
                'performance_period_id' => $period->id,
                'assigned_tasks' => $assigned,
                'completed_tasks' => $completed,
                'completed_on_time_tasks' => $onTime,
                'overdue_tasks' => $overdue,
                'completion_rate' => $completionRate,
                'on_time_rate' => $onTimeRate,
                'task_weight_score' => $taskWeightScore,
                'supervisor_score' => $supervisorScore,
                'final_epi' => $finalEpi,
                'category' => $category,
            ]);
        }
        // === END OF DUMMY DATA ===
    }
}
