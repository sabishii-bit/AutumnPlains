// Checks user's device
export class DeviceDetectionService {
    private static instance: DeviceDetectionService;
    private userAgent: string;
    private _isMobile: boolean;

    private constructor() {
        this.userAgent = navigator.userAgent || navigator.vendor;
        this._isMobile = this.detectMobile();
    }

    public static getInstance(): DeviceDetectionService {
        if (!DeviceDetectionService.instance) {
            DeviceDetectionService.instance = new DeviceDetectionService();
        }
        return DeviceDetectionService.instance;
    }

    private detectMobile(): boolean {
        return /android|iPad|iPhone|iPod|windows phone|tablet|playbook|silk/i.test(this.userAgent);
    }

    public isMobile(): boolean {
        return this._isMobile;
    }

    public isIOS(): boolean {
        return /iPad|iPhone|iPod/.test(this.userAgent) && !(window as any).MSStream;
    }

    public isAndroid(): boolean {
        return /android/i.test(this.userAgent);
    }

    public isDesktop(): boolean {
        return !this.isMobile();
    }

    public getDeviceInfo(): { type: string; os: string; } {
        let type = this.isMobile() ? 'mobile' : 'desktop';
        let os = 'unknown';
        
        if (this.isIOS()) {
            os = 'iOS';
        } else if (this.isAndroid()) {
            os = 'Android';
        } else if (/Windows/.test(this.userAgent)) {
            os = 'Windows';
        } else if (/Mac/.test(this.userAgent)) {
            os = 'MacOS';
        } else if (/Linux/.test(this.userAgent)) {
            os = 'Linux';
        }
        
        return { type, os };
    }
}
