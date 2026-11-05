import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, post, errors, processing, recentlySuccessful } =
        useForm({
            _method: 'patch',
            name: user.name,
            email: user.email,
            phone_number: user.phone_number || '',
            photo: null as File | null,
        });

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part.charAt(0)).join('').toUpperCase();

    useEffect(() => {
        if (!data.photo) {
            setPhotoPreview(null);
            return;
        }

        const objectUrl = URL.createObjectURL(data.photo);
        setPhotoPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [data.photo]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('profile.update'));
    };

    return (
        <section className={className}>
            <header className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E31B23]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0" /></svg>
                </span>
                <div>
                    <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                    <p className="mt-0.5 text-sm text-slate-500">Your photo, contact details, and account identity.</p>
                </div>
            </header>

            <form onSubmit={submit} className="mt-5 space-y-5">
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-red-100 text-xl font-bold text-red-700 shadow-sm">
                        {(photoPreview || user.profile_photo_url) ? (
                            <img src={photoPreview || user.profile_photo_url} alt={`Preview foto ${user.name}`} className="h-full w-full object-cover" />
                        ) : initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <InputLabel htmlFor="photo" value="Profile Photo (Face required)" />
                        <p className="mt-1 text-xs text-slate-500">Choose a clear photo of your face.</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <input
                                id="photo"
                                type="file"
                                className="peer sr-only"
                                onChange={(e) => setData('photo', e.target.files ? e.target.files[0] : null)}
                                accept="image/*"
                                required={!user.profile_photo_path}
                            />
                            <label htmlFor="photo" className="cursor-pointer rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-[#E31B23] transition hover:bg-red-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red-500">
                                {user.profile_photo_path ? 'Change Photo' : 'Choose Photo'}
                            </label>
                            <span className="max-w-[230px] truncate text-xs text-slate-500">{data.photo?.name || 'No new photo selected'}</span>
                        </div>
                        <InputError className="mt-2" message={errors.photo} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="name" value="Full Name" />
                        <TextInput id="name" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoComplete="name" />
                        <InputError className="mt-2" message={errors.name} />
                    </div>

                    <div>
                        <InputLabel htmlFor="phone_number" value="Phone Number" />
                        <TextInput id="phone_number" type="tel" className="mt-1 block w-full" value={data.phone_number} onChange={(e) => setData('phone_number', e.target.value)} autoComplete="tel" placeholder="Your contact number" />
                        <InputError className="mt-2" message={errors.phone_number as string | undefined} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email Address" />
                    <TextInput id="email" type="email" className="mt-1 block w-full" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="username" />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
                    <PrimaryButton disabled={processing}>Save Changes</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-semibold text-emerald-700">Profile updated successfully.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
