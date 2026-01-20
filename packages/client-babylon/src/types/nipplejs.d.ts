declare module 'nipplejs' {
    export interface JoystickManagerOptions {
        zone?: HTMLElement;
        color?: string;
        size?: number;
        threshold?: number;
        fadeTime?: number;
        multitouch?: boolean;
        maxNumberOfNipples?: number;
        dataOnly?: boolean;
        position?: { top?: string; left?: string; right?: string; bottom?: string };
        mode?: 'static' | 'semi' | 'dynamic';
        restJoystick?: boolean;
        restOpacity?: number;
        lockX?: boolean;
        lockY?: boolean;
        catchDistance?: number;
        shape?: 'circle' | 'square';
        dynamicPage?: boolean;
        follow?: boolean;
    }

    export interface JoystickOutputData {
        angle: {
            radian: number;
            degree: number;
        };
        direction: {
            x: 'left' | 'right';
            y: 'up' | 'down';
            angle: string;
        };
        distance: number;
        force: number;
        pressure: number;
        position: {
            x: number;
            y: number;
        };
        vector: {
            x: number;
            y: number;
        };
        instance: JoystickManager;
    }

    export interface JoystickManager {
        on(event: 'start' | 'end' | 'move' | 'dir' | 'plain' | 'shown' | 'hidden' | 'added' | 'removed' | 'pressure', handler: (evt: any, data: JoystickOutputData) => void): void;
        off(event: string, handler?: Function): void;
        destroy(): void;
        get(id: number): any;
    }

    export function create(options: JoystickManagerOptions): JoystickManager;

    const nipplejs: {
        create: typeof create;
    };

    export default nipplejs;
}
