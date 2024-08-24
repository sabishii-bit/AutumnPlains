// Checks user's device
export class DeviceDetectionService {
    private userAgent: string;

    constructor() {
        this.userAgent = navigator.userAgent || navigator.vendor;
    }

    public isMobile(): boolean {
        return /android|iPad|iPhone|iPod|windows phone|tablet|playbook|silk/i.test(this.userAgent);
    }

    public isDesktop(): boolean {
        return !this.isMobile();
    }
}
