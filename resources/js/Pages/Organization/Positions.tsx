import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/Card';
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/Components/Table';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import StatusBadge from '@/Components/StatusBadge';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import TextareaInput from '@/Components/TextareaInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import EmptyState from '@/Components/EmptyState';

interface DepartmentOption {
    id: number;
    name: string;
}

interface PositionItem {
    id: number;
    department_id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    is_active: boolean;
    employees_count: number;
    department?: DepartmentOption | null;
}

interface PositionsPageProps extends PageProps {
    positions: PositionItem[];
    departments: DepartmentOption[];
    filters: {
        department_id?: string;
        status?: string;
        search?: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function Positions({
    auth,
    positions = [],
    departments = [],
    filters = {},
    flash,
}: PositionsPageProps) {
    const posList: PositionItem[] = Array.isArray(positions) ? positions : (Object.values(positions || {}) as PositionItem[]);
    const deptList: DepartmentOption[] = Array.isArray(departments) ? departments : (Object.values(departments || {}) as DepartmentOption[]);

    const [showModal, setShowModal] = useState(false);
    const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);
    const [searchValue, setSearchValue] = useState(filters?.search || '');

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        department_id: '',
        name: '',
        code: '',
        description: '',
        is_active: true as boolean,
    });

    const applyFilters = (next: Record<string, string>) => {
        const merged = {
            department_id: filters?.department_id || '',
            status: filters?.status || '',
            search: searchValue,
            ...next,
        };
        router.get(route('positions.index'), merged, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchChange = (value: string) => {
        setSearchValue(value);
        applyFilters({ search: value });
    };

    const openCreateModal = () => {
        setEditingPosition(null);
        clearErrors();
        setData({
            department_id: filters?.department_id || '',
            name: '',
            code: '',
            description: '',
            is_active: true,
        });
        setShowModal(true);
    };

    const openEditModal = (pos: PositionItem) => {
        setEditingPosition(pos);
        clearErrors();
        setData({
            department_id: String(pos.department_id),
            name: pos.name,
            code: pos.code || '',
            description: pos.description || '',
            is_active: Boolean(pos.is_active),
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPosition(null);
        clearErrors();
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPosition) {
            put(route('positions.update', editingPosition.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('positions.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleToggleStatus = (pos: PositionItem) => {
        const action = pos.is_active ? 'deactivate' : 'activate';
        if (confirm(`Are you sure you want to ${action} "${pos.name}"?`)) {
            router.patch(route('positions.toggle-status', pos.id), {}, { preserveScroll: true });
        }
    };

    const handleDelete = (pos: PositionItem) => {
        if (pos.employees_count > 0) {
            alert('Cannot delete a position currently assigned to employees. Deactivate it instead.');
            return;
        }
        if (confirm(`Are you sure you want to delete "${pos.name}"?`)) {
            destroy(route('positions.destroy', pos.id), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <PageHeader
                    title="Positions"
                    subtitle="Define and manage department-specific job titles and position availability"
                    moduleName="Human Capital"
                    primaryAction={{
                        label: '+ New Position',
                        onClick: openCreateModal,
                    }}
                />
            }
        >
            <Head title="Positions" />

            <div className="w-full space-y-4">
                {flash?.success && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
                        {flash.error}
                    </div>
                )}

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <TextInput
                            type="text"
                            placeholder="Search position name or code..."
                            value={searchValue}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-9 text-xs"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <SelectInput
                        aria-label="Filter by department"
                        value={filters?.department_id || ''}
                        onChange={(e) => applyFilters({ department_id: e.target.value })}
                        className="text-xs min-w-[180px]"
                    >
                        <option value="">All Departments</option>
                        {deptList.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </SelectInput>

                    <SelectInput
                        aria-label="Filter by status"
                        value={filters?.status || ''}
                        onChange={(e) => applyFilters({ status: e.target.value })}
                        className="text-xs min-w-[130px]"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </SelectInput>

                    <span className="ml-auto text-xs text-slate-500">
                        {posList.length} position{posList.length === 1 ? '' : 's'}
                    </span>
                </div>

                {/* Positions Table */}
                <Card>
                    {posList.length > 0 ? (
                        <Table>
                            <TableHead>
                                <tr>
                                    <TableHeaderCell>Position Name</TableHeaderCell>
                                    <TableHeaderCell>Department</TableHeaderCell>
                                    <TableHeaderCell>Code</TableHeaderCell>
                                    <TableHeaderCell>Description</TableHeaderCell>
                                    <TableHeaderCell align="center">Employees</TableHeaderCell>
                                    <TableHeaderCell align="center">Status</TableHeaderCell>
                                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                                </tr>
                            </TableHead>
                            <TableBody>
                                {posList.map((pos) => (
                                    <TableRow key={pos.id}>
                                        <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                                            {pos.name}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <Badge variant="info" size="sm">
                                                {pos.department?.name || 'Unassigned'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-mono text-slate-500">
                                            {pos.code || '-'}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-slate-500" title={pos.description || ''}>
                                            {pos.description || '-'}
                                        </TableCell>
                                        <TableCell align="center" className="whitespace-nowrap">
                                            <Badge variant="neutral">
                                                {pos.employees_count} staff
                                            </Badge>
                                        </TableCell>
                                        <TableCell align="center" className="whitespace-nowrap">
                                            <StatusBadge status={pos.is_active ? 'Active' : 'Inactive'} />
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(pos)}
                                                className="text-xs font-semibold text-[#E31B23] hover:text-[#c4141b] transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(pos)}
                                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                                            >
                                                {pos.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(pos)}
                                                disabled={pos.employees_count > 0}
                                                title={pos.employees_count > 0 ? 'Cannot delete position assigned to employees' : 'Delete position'}
                                                className={`text-xs font-semibold transition-colors ${
                                                    pos.employees_count > 0
                                                        ? 'text-slate-300 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-rose-600'
                                                }`}
                                            >
                                                Delete
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-6">
                            <EmptyState
                                title="No positions found"
                                description="Create a department-specific position or adjust your search and filter criteria."
                                actionLabel="+ New Position"
                                onAction={openCreateModal}
                            />
                        </div>
                    )}
                </Card>
            </div>

            {/* Create / Edit Position Modal */}
            <Modal show={showModal} onClose={closeModal} maxWidth="lg">
                <form onSubmit={submit}>
                    <div className="px-6 py-5 border-b border-slate-200/80">
                        <h3 className="text-base font-bold text-slate-900">
                            {editingPosition ? 'Edit Position' : 'Create Position'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Associate this position with a specific department.
                        </p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <InputLabel htmlFor="position_department_id">
                                Department <span className="text-rose-500">*</span>
                            </InputLabel>
                            <SelectInput
                                id="position_department_id"
                                value={data.department_id}
                                onChange={(e) => setData('department_id', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={Boolean(editingPosition && editingPosition.employees_count > 0)}
                                required
                            >
                                <option value="">-- Select Department --</option>
                                {deptList.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </SelectInput>
                            {editingPosition && editingPosition.employees_count > 0 && (
                                <p className="mt-1 text-[11px] text-amber-700">
                                    Department cannot be changed while {editingPosition.employees_count} employee(s) are assigned to this position.
                                </p>
                            )}
                            <InputError message={errors.department_id} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="position_name">
                                Position Name <span className="text-rose-500">*</span>
                            </InputLabel>
                            <TextInput
                                id="position_name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., HR Officer, IT Support, Room Attendant"
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="position_code" value="Position Code (Optional)" />
                            <TextInput
                                id="position_code"
                                type="text"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                placeholder="e.g., HR-OFC, IT-SUP"
                                className="mt-1 block w-full font-mono"
                            />
                            <InputError message={errors.code} className="mt-1" />
                        </div>

                        <div>
                            <InputLabel htmlFor="position_description" value="Description (Optional)" />
                            <TextareaInput
                                id="position_description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={3}
                                placeholder="Brief responsibilities or role scope..."
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.description} className="mt-1" />
                        </div>

                        <div className="flex items-center gap-2.5 pt-1">
                            <input
                                id="position_is_active"
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]/30"
                            />
                            <label htmlFor="position_is_active" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                                Active (available for new employee assignments)
                            </label>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-3.5 flex justify-end gap-3 border-t border-slate-200/80">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? 'Saving...' : editingPosition ? 'Update Position' : 'Save Position'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
