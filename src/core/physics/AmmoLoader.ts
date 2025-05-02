/**
 * Utility for loading Ammo.js by injecting it as a script tag directly
 * This is a fallback approach if module bundling fails in production
 */

// Define the Ammo global type to avoid TypeScript errors
declare global {
    interface Window {
        Ammo: any;
    }
}

/**
 * Loads Ammo.js by dynamically injecting a script tag
 * @param ammoUrl The URL to the Ammo.js script
 * @returns A promise that resolves to the Ammo instance
 */
export const loadAmmoScript = (ammoUrl: string = 'assets/ammo.js'): Promise<any> => {
    return new Promise((resolve, reject) => {
        // Skip if Ammo is already available globally
        if (window.Ammo) {
            console.log("Ammo.js already loaded, using global instance");
            resolve(window.Ammo);
            return;
        }

        console.log(`Loading Ammo.js from ${ammoUrl}...`);
        const script = document.createElement('script');
        script.async = true;
        script.src = ammoUrl;
        
        script.onload = () => {
            console.log("Ammo.js script loaded successfully");
            // Wait a short period for Ammo to initialize
            setTimeout(() => {
                if (window.Ammo) {
                    resolve(window.Ammo);
                } else {
                    reject(new Error("Ammo loaded but not available as window.Ammo"));
                }
            }, 100);
        };
        
        script.onerror = () => {
            reject(new Error(`Failed to load Ammo.js from ${ammoUrl}`));
        };
        
        document.head.appendChild(script);
    });
};

/**
 * Alternative loading method that works with both module and script approaches
 */
export const loadAmmo = async (): Promise<any> => {
    try {
        // First try module import
        console.log("Trying module import for Ammo.js...");
        const AmmoModule: any = await import('ammojs3');
        
        console.log("Ammo module loaded:", AmmoModule);
        
        // Check for different export patterns
        if (typeof AmmoModule.default === 'function') {
            console.log("Using Ammo.default function");
            return await (AmmoModule.default as Function).bind(window)();
        } 
        else if (typeof AmmoModule === 'function') {
            console.log("Using Ammo module as function");
            return await (AmmoModule as Function).bind(window)();
        }
        else if (AmmoModule.default && typeof AmmoModule.default.then === 'function') {
            console.log("Using Ammo.default promise");
            const ammo = await AmmoModule.default;
            return ammo;
        }
        else if (typeof AmmoModule.then === 'function') {
            console.log("Using Ammo module as promise");
            const ammo = await AmmoModule;
            return ammo;
        }
        else {
            console.log("Unexpected Ammo module format:", AmmoModule);
            throw new Error("Invalid Ammo module format");
        }
    } catch (moduleError) {
        console.warn("Module import failed, falling back to script loading:", moduleError);
        
        // Try different script locations
        try {
            // Try without leading slash first
            return await loadAmmoScript();
        } catch (scriptError1) {
            console.warn("First script load attempt failed, trying with absolute path:", scriptError1);
            
            try {
                // Try with leading slash
                return await loadAmmoScript('/assets/ammo.js');
            } catch (scriptError2) {
                console.warn("Second script load attempt failed, trying direct path:", scriptError2);
                
                try {
                    // Try direct path to node_modules
                    return await loadAmmoScript('./node_modules/ammojs3/dist/ammo.js');
                } catch (scriptError3) {
                    console.error("All Ammo.js loading methods failed");
                    throw scriptError3;
                }
            }
        }
    }
}; 