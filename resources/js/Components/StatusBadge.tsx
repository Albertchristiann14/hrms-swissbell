import Badge, { BadgeSize, BadgeVariant } from './Badge';

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
    active: 'success',
    approved: 'success',
    completed: 'success',
    done: 'success',
    present: 'success',
    available: 'success',
    paid: 'success',
    resolved: 'success',
    returned: 'success',

    pending: 'warning',
    'in progress': 'info',
    in_progress: 'info',
    processing: 'info',
    review: 'warning',
    'on leave': 'warning',
    'on hold': 'warning',
    late: 'warning',
    planning: 'info',
    'in use': 'info',
    borrowed: 'info',
    open: 'info',

    rejected: 'danger',
    overdue: 'danger',
    absent: 'danger',
    resigned: 'danger',
    cancelled: 'danger',
    declined: 'danger',
    disposed: 'danger',
    urgent: 'danger',
    critical: 'danger',

    inactive: 'neutral',
    draft: 'neutral',
    'to do': 'neutral',
    todo: 'neutral',
    closed: 'neutral',
    maintenance: 'warning',
};

interface StatusBadgeProps {
    status: string;
    label?: string;
    size?: BadgeSize;
    dot?: boolean;
    className?: string;
}

export default function StatusBadge({
    status,
    label,
    size = 'sm',
    dot = true,
    className = '',
}: StatusBadgeProps) {
    const normalized = (status || '').trim().toLowerCase();
    const variant = STATUS_VARIANT_MAP[normalized] || 'neutral';

    return (
        <Badge variant={variant} size={size} dot={dot} className={className}>
            {label || status}
        </Badge>
    );
}
