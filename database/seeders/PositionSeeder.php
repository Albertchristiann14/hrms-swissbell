<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Position;
use Illuminate\Database\Seeder;

class PositionSeeder extends Seeder
{
    /**
     * Initial department and position master data.
     * Exact spelling and capitalization are intentionally preserved.
     */
    public static function masterData(): array
    {
        return [
            'Accounting' => [
                'Finance Manager',
                'Account Receivable',
                'Purchasing',
                'Book Keeper',
                'Cost Control',
                'Income Audit',
                'General Cashier',
                'Store',
            ],
            'IT' => [
                'IT manager',
                'IT Staff',
            ],
            'Front Office' => [
                'Front Office Manager',
                'Resevation',
            ],
            'Food Beverage' => [
                'Chef',
                'Captain',
                'Food Beverage Manager',
            ],
            'A&G Office' => [
                'General Manager',
                'AG Secretary',
                'Humah Resource Manager',
                'Human Resource Development',
            ],
            'Sales Marketing' => [
                'Director of Sales',
                'Design Graphic',
                'Senior Sales Manager',
                'Hotel Sales Manager',
            ],
            'Security' => [
                'Staff Security',
            ],
            'Housekeeping' => [
                'Housekeeping Manager',
                'Admin Housekeeping',
            ],
            'Engineering' => [
                'Chief Engineering',
                'Admin engineering',
            ],
            'Banquet' => [
                'Asst. Banquet Operations Manager',
            ],
            'Laundry' => [
                'Laundry manager',
                'laundry admin',
            ],
            'Steward' => [
                'Chief Steward',
            ],
        ];
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $masterData = static::masterData();

        $departmentsMatched = 0;
        $unmatchedDepartments = [];
        $positionsCreated = 0;
        $positionsExisting = 0;

        foreach ($masterData as $departmentName => $positions) {
            $department = Department::where('name', $departmentName)->first();

            if ($department) {
                $departmentsMatched++;
            } else {
                $unmatchedDepartments[] = $departmentName;
                $department = Department::firstOrCreate(['name' => $departmentName]);
            }

            foreach ($positions as $positionName) {
                $position = Position::firstOrCreate(
                    [
                        'department_id' => $department->id,
                        'name' => $positionName,
                    ],
                    [
                        'is_active' => true,
                    ]
                );

                if ($position->wasRecentlyCreated) {
                    $positionsCreated++;
                } else {
                    $positionsExisting++;
                }
            }
        }

        if ($this->command) {
            $this->command->info("PositionSeeder completed:");
            $this->command->line(" - Total departments in DB: " . Department::count());
            $this->command->line(" - Existing departments matched: {$departmentsMatched}");
            $this->command->line(" - Unmatched departments (created): " . (count($unmatchedDepartments) > 0 ? implode(', ', $unmatchedDepartments) : 'None'));
            $this->command->line(" - Positions created: {$positionsCreated}");
            $this->command->line(" - Positions already existing: {$positionsExisting}");
        }
    }
}
