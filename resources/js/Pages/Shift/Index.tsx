import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';

interface ShiftItem {
    id: number;
    name: string;
    code?: string | null;
    start_time: string;
    end_time: string;
    clock_in_window_start?: string | null;
    clock_in_window_end?: string | null;
    clock_out_window_start?: string | null;
    clock_out_window_end?: string | null;
    is_overnight: boolean;
    late_tolerance_minutes: number;
    is_active: boolean;
    color: string;
    work_schedules_count?: number;
    attendances_count?: number;
}

export default function ShiftIndex({ shifts: rawShifts }: { shifts: ShiftItem[] }) {
    const shifts: ShiftItem[] = Array.isArray(rawShifts)
        ? rawShifts
        : (rawShifts && typeof rawShifts === 'object' && Array.isArray((rawShifts as any).data)
            ? (rawShifts as any).data
            : Object.values(rawShifts || {}).filter((s: any) => s && typeof s === 'object' && 'id' in s) as ShiftItem[]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        name: '',
        code: '',
        start_time: '',
        end_time: '',
        clock_in_window_start: '',
        clock_in_window_end: '',
        clock_out_window_start: '',
        clock_out_window_end: '',
        is_overnight: false,
        late_tolerance_minutes: 0,
        is_active: true,
        color: '#E31B23',
    });

    const openModal = (shift: ShiftItem | null = null) => {
        if (shift) {
            setEditingShift(shift);
            setData({
                name: shift.name,
                code: shift.code || '',
                start_time: shift.start_time ? shift.start_time.substring(0, 5) : '',
                end_time: shift.end_time ? shift.end_time.substring(0, 5) : '',
                clock_in_window_start: shift.clock_in_window_start ? shift.clock_in_window_start.substring(0, 5) : '',
                clock_in_window_end: shift.clock_in_window_end ? shift.clock_in_window_end.substring(0, 5) : '',
                clock_out_window_start: shift.clock_out_window_start ? shift.clock_out_window_start.substring(0, 5) : '',
                clock_out_window_end: shift.clock_out_window_end ? shift.clock_out_window_end.substring(0, 5) : '',
                is_overnight: !!shift.is_overnight,
                late_tolerance_minutes: shift.late_tolerance_minutes || 0,
                is_active: shift.is_active !== false,
                color: shift.color || '#E31B23',
            });
        } else {
            setEditingShift(null);
            reset();
            setData({
                name: '',
                code: '',
                start_time: '08:00',
                end_time: '17:00',
                clock_in_window_start: '07:00',
                clock_in_window_end: '09:00',
                clock_out_window_start: '16:30',
                clock_out_window_end: '19:00',
                is_overnight: false,
                late_tolerance_minutes: 15,
                is_active: true,
                color: '#E31B23',
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
        setEditingShift(null);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingShift) {
            put(route('shifts.update', editingShift.id), {
                onSuccess: () => closeModal(),
            });
        } else {
            post(route('shifts.store'), {
                onSuccess: () => closeModal(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to remove or deactivate this shift? If historical attendance exists, it will be safely deactivated.')) {
            destroy(route('shifts.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-bold text-xl text-slate-900 tracking-tight">Work Shift Settings</h2>}>
            <Head title="Work Shifts" />

            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Hotel Shift Master Definitions</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Define operational shift hours, geofence clock-in/out windows, and grace periods for punctuality.
                                </p>
                            </div>
                            <PrimaryButton onClick={() => openModal()} className="text-xs">
                                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add New Shift
                            </PrimaryButton>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                        <th className="px-5 py-3.5">Code & Color</th>
                                        <th className="px-5 py-3.5">Shift Name</th>
                                        <th className="px-5 py-3.5">Working Hours</th>
                                        <th className="px-5 py-3.5">Clock-In Window</th>
                                        <th className="px-5 py-3.5">Clock-Out Window</th>
                                        <th className="px-5 py-3.5 text-center">Tolerance</th>
                                        <th className="px-5 py-3.5 text-center">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {shifts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700">No work shifts defined yet</p>
                                                <p className="text-xs text-slate-400 mt-1">Use the "Add New Shift" button above to create one.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        shifts.map((shift) => (
                                            <tr key={shift.id} className="hover:bg-slate-50/75 transition-colors">
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-2xs shrink-0"
                                                            style={{ backgroundColor: shift.color }}
                                                        ></span>
                                                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                                            {shift.code || 'SH'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                                    <div>
                                                        <span>{shift.name}</span>
                                                        {shift.is_overnight && (
                                                            <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded border border-indigo-200">
                                                                Overnight
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-700 font-mono whitespace-nowrap">
                                                    {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)} WIB
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                                    {shift.clock_in_window_start ? `${shift.clock_in_window_start.substring(0, 5)} - ${shift.clock_in_window_end?.substring(0, 5)}` : 'Standard Window'}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                                    {shift.clock_out_window_start ? `${shift.clock_out_window_start.substring(0, 5)} - ${shift.clock_out_window_end?.substring(0, 5)}` : 'Standard Window'}
                                                </td>
                                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                                    <span className="text-slate-600">{shift.late_tolerance_minutes || 0}m</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        shift.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {shift.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => openModal(shift)}
                                                            className="text-slate-700 hover:text-slate-900 font-semibold text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(shift.id)}
                                                            className="text-rose-600 hover:text-rose-700 font-semibold text-xs bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE / EDIT SHIFT MODAL */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <h2 className="text-base font-bold text-slate-900">
                            {editingShift ? 'Edit Work Shift' : 'Add New Work Shift'}
                        </h2>
                        <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <InputLabel htmlFor="name" value="Shift Name *" />
                                <TextInput
                                    id="name"
                                    className="mt-1 block w-full text-xs"
                                    placeholder="e.g. Morning Shift"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="code" value="Shift Code" />
                                <TextInput
                                    id="code"
                                    className="mt-1 block w-full text-xs font-mono uppercase"
                                    placeholder="e.g. MS"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                />
                                <InputError message={errors.code} className="mt-1" />
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <InputLabel htmlFor="start_time" value="Shift Start Time *" />
                                <TextInput
                                    id="start_time"
                                    type="time"
                                    className="mt-1 block w-full text-xs"
                                    value={data.start_time}
                                    onChange={(e) => setData('start_time', e.target.value)}
                                    required
                                />
                                <InputError message={errors.start_time} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="end_time" value="Shift End Time *" />
                                <TextInput
                                    id="end_time"
                                    type="time"
                                    className="mt-1 block w-full text-xs"
                                    value={data.end_time}
                                    onChange={(e) => setData('end_time', e.target.value)}
                                    required
                                />
                                <InputError message={errors.end_time} className="mt-1" />
                            </div>
                        </div>

                        {/* Permitted Windows */}
                        <div className="space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                            <span className="text-[11px] font-bold text-purple-900 block">
                                Clock-In & Clock-Out Permitted Windows
                            </span>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel value="Clock-In Opens" />
                                    <TextInput
                                        type="time"
                                        className="mt-1 block w-full text-xs"
                                        value={data.clock_in_window_start}
                                        onChange={(e) => setData('clock_in_window_start', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Clock-In Closes" />
                                    <TextInput
                                        type="time"
                                        className="mt-1 block w-full text-xs"
                                        value={data.clock_in_window_end}
                                        onChange={(e) => setData('clock_in_window_end', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel value="Clock-Out Opens" />
                                    <TextInput
                                        type="time"
                                        className="mt-1 block w-full text-xs"
                                        value={data.clock_out_window_start}
                                        onChange={(e) => setData('clock_out_window_start', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <InputLabel value="Clock-Out Closes" />
                                    <TextInput
                                        type="time"
                                        className="mt-1 block w-full text-xs"
                                        value={data.clock_out_window_end}
                                        onChange={(e) => setData('clock_out_window_end', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grace Period & Color */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <InputLabel value="Grace Period (Minutes)" />
                                <TextInput
                                    type="number"
                                    min={0}
                                    max={180}
                                    className="mt-1 block w-full text-xs"
                                    value={data.late_tolerance_minutes}
                                    onChange={(e) => setData('late_tolerance_minutes', parseInt(e.target.value, 10) || 0)}
                                />
                                <span className="text-[10px] text-slate-400 block mt-0.5">Tolerance before marked Late</span>
                            </div>

                            <div>
                                <InputLabel value="Roster Badge Color" />
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        className="h-9 w-12 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                                        value={data.color}
                                        onChange={(e) => setData('color', e.target.value)}
                                    />
                                    <TextInput
                                        className="w-full text-xs font-mono uppercase"
                                        value={data.color}
                                        onChange={(e) => setData('color', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Overnight & Active Flags */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_overnight}
                                    onChange={(e) => setData('is_overnight', e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-semibold text-slate-800 text-xs">Overnight Shift (Crosses Midnight)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
                                />
                                <span className="font-semibold text-slate-800 text-xs">Active</span>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <SecondaryButton type="button" onClick={closeModal}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing} className="text-xs">
                            {processing ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
