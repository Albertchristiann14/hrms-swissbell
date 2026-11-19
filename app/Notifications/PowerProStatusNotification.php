<?php

namespace App\Notifications;

use App\Models\PowerProRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PowerProStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public PowerProRequest $powerProRequest;
    public string $type;
    public ?string $customMessage;

    /**
     * Create a new notification instance.
     *
     * @param PowerProRequest $powerProRequest
     * @param string $type NEW_REQUEST | APPROVED_BY_HOD | USER_ID_ISSUED | REJECTED
     * @param string|null $customMessage
     */
    public function __construct(PowerProRequest $powerProRequest, string $type = 'NEW_REQUEST', ?string $customMessage = null)
    {
        $this->powerProRequest = $powerProRequest;
        $this->type = $type;
        $this->customMessage = $customMessage;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $reqNum = $this->powerProRequest->request_number;
        $employeeName = $this->powerProRequest->employee?->user?->name ?? 'Karyawan';
        $deptName = $this->powerProRequest->department?->name ?? 'Departemen';

        switch ($this->type) {
            case 'NEW_REQUEST':
                $title = 'Permohonan ID Power Pro Baru';
                $message = "Pengajuan ID Power Pro ({$reqNum}) untuk {$employeeName} ({$deptName}) memerlukan persetujuan HOD.";
                break;

            case 'APPROVED_BY_HOD':
                $approverName = $this->powerProRequest->approved_by_username ?? 'HOD';
                $title = 'Permohonan ID Power Pro Disetujui HOD';
                $message = "Permohonan {$reqNum} untuk {$employeeName} telah disetujui oleh {$approverName} dan menunggu penerbitan akun oleh IT.";
                break;

            case 'USER_ID_ISSUED':
                $userId = $this->powerProRequest->created_user_id ?? '-';
                $title = 'User ID Power Pro Telah Terbit';
                $message = "User ID Power Pro [{$userId}] untuk {$employeeName} telah berhasil diterbitkan oleh IT dan siap digunakan.";
                break;

            case 'REJECTED':
                $reason = $this->powerProRequest->rejection_reason ?: 'Tidak disetujui';
                $title = 'Permohonan ID Power Pro Ditolak';
                $message = "Permohonan {$reqNum} untuk {$employeeName} ditolak. Alasan: {$reason}";
                break;

            default:
                $title = 'Update Permohonan ID Power Pro';
                $message = $this->customMessage ?: "Status permohonan {$reqNum} telah diperbarui.";
                break;
        }

        return [
            'power_pro_request_id' => $this->powerProRequest->id,
            'request_number' => $reqNum,
            'title' => $title,
            'message' => $message,
            'action_url' => route('power-pro.index', ['search' => $reqNum]),
            'category' => 'power_pro',
            'type' => 'power_pro_status',
        ];
    }
}
