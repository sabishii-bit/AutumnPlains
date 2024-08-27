import { DeviceDetectionService } from '../services/device/DeviceDetectionService';
import { KeyboardControls } from './KeyboardControls';
import { MobileControls } from './MobileControls';
import { PlayerControls } from './PlayerControls';

export class ControllerManager {
    private static instance: ControllerManager;
    private controls: PlayerControls;

    private constructor(domElement: HTMLElement) {
        const deviceService = new DeviceDetectionService();

        if (deviceService.isMobile()) {
            this.controls = new MobileControls();
        } else if (deviceService.isDesktop()) {
            this.controls = new KeyboardControls(domElement);
        } else {
            throw new Error("Unsupported device type");
        }
    }

    public static getInstance(domElement: HTMLElement): ControllerManager {
        if (!ControllerManager.instance) {
            ControllerManager.instance = new ControllerManager(domElement);
        }
        return ControllerManager.instance;
    }

    public getControls(): PlayerControls {
        return this.controls;
    }

    public update(deltaTime: number) {
        this.controls.update(deltaTime);
    }
}
