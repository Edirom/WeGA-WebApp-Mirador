import Mirador from 'mirador';
import { miradorImageToolsPlugin } from 'mirador-image-tools';


class WegaMirador extends HTMLElement {
    static observedAttributes = ["canvasindexorid", "url"];

    constructor() {
        // Always call super first in constructor
        super();

        // Start Mirador from scratch
        this.viewer = null;
        this._readyDispatched = false;

        /*
        Make sure the current element has an id attribute
        since we need it to address the Mirador viewer
        instance later on.
        */
        if(this.id === "") {
            this.id = self.crypto.randomUUID();
        }
    }

    connectedCallback() {
        // Check whether the wega-mirador element is visible in the viewport
        // this prevents issues with mis-calculated window sizes when Mirador
        // is initialized in a hidden container (e.g. inside a tab or accordion)
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.viewer) {
                    // initialize viewer when visible
                    this.initViewer();

                    // … and add listener for custom viewer-ready event
                    this.addEventListener('viewer-ready', () => {
                        if (this.canvasindexorid && this.url) {
                            this.canvasindexorid.forEach((val, i) => {
                                const manifest = this.url[i];
                                if (manifest) {
                                    console.log("Custom event fired.");
                                    this.goToCanvas(manifest, val)
                                        .catch(err => console.error('goToCanvas failed', err));
                                }
                            });
                        }
                    }, { once: true });

                    // Observer is not needed anymore
                    observer.disconnect();
                }
            });
        }, {
            threshold: 0.1 // at least 10% must be visible
        });

        observer.observe(this);

        console.log("Custom element added to page.");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} has changed.`);

        this[name] = newValue.split(/\s+/);

        // If the viewer already exists and the canvasindexorid attribute changed,
        // jump to the requested canvas(es).
        if (this._readyDispatched && name === 'canvasindexorid') {
            // canvasindexorid is an array of values (strings). Each value may be either
            // - a numeric index (e.g. "3") referring to the position inside the manifest
            // - a full canvas id/IRI (e.g. "https://.../canvas/3")
            this.canvasindexorid.forEach((val, i) => {
                const manifest = (this.url && this.url[i]) ? this.url[i] : null;
                if (!manifest) return;

                this.goToCanvas(manifest, val).catch(err => console.error('goToCanvas failed', err));
            });
        }
    }

    initViewer() {
        this.viewer = Mirador.viewer({
            id: this.id,
            "themes": {
                "light": {
                    "palette": {
                        "type": "light",
                        "primary": {
                            "main": "#0064B4"
                        }
                    }
                }
            },
            "window": {
                "allowClose": true,
                "allowFullscreen": true,
                "sideBarOpenByDefault": false,
                "defaultView": "single",
                "views": [
                    { key: "single", behaviors: ["individuals", "paged"] },
                    { key: "book", behaviors: ["paged"] },
                    { key: "scroll", behaviors: ["continuous"] },
                    { key: "gallery" }
                ]
            },
            "workspace": {
                "showZoomControls": true
            },
            "windows":
                this.url.map(
                    (manifest, index) => ({
                        "manifestId": manifest,
                        "id": manifest,
                        "canvasIndex": this.canvasindexorid[index],
                        "imageToolsEnabled": true,
                        "imageToolsOpen": true
                    })
                )
        }, [...miradorImageToolsPlugin])

        // Listen to Mirador state changes
        this.viewer.store.subscribe(() => {
            const state = this.viewer.store.getState();

            // set our own conditions to check for
            const manifestIds = this.url || [];
            const allManifestsLoaded = manifestIds.every(id => {
                // manifests must be present
                const manifest = state.manifests?.[id];
                // canvasId must be set
                const canvasId = state.windows?.[id].canvasId;
                // … and no errors
                return canvasId && manifest && !manifest.error && manifest.json;
            });

            if (allManifestsLoaded && !this._readyDispatched) {
                this._readyDispatched = true;

                // dispatching our custom 'viewer-ready' event
                this.dispatchEvent(new CustomEvent('viewer-ready', {
                    detail: { viewer: this.viewer, state }
                }));
            }
        });
    }


    /**
     * Jump to a specific canvas in a manifest. canvasIndexOrId may be either a numeric
     * index (0-based) or a full canvas id/IRI. This method will grab the manifest to
     * resolve the canvas id from the viewer store when an index is provided.
     * It supports IIIF Presentation v3 (manifest.items[]) and
     * v2 (manifest.sequences[0].canvases[]).
     *
     * Usage examples:
     *   document.querySelector('wega-mirador').goToCanvas(manifestUrl, 5);
     *   document.querySelector('wega-mirador').goToCanvas(manifestUrl, 'https://.../canvas/10');
     */
    async goToCanvas(manifestId, canvasIndexOrId) {
        // Error out when viewer ist no initialized
        if (!this._readyDispatched) {
            throw new Error('Viewer not initialized');
        }

        let canvasId = null;
        const maybeIndex = parseInt(canvasIndexOrId, 10);

        // If a number was provided, fetch the manifest and map index -> id
        if (!Number.isNaN(maybeIndex)) {
            const index = maybeIndex;
            try {
                // Get manifest from Mirador's Redux store
                // to map index number to canvas ID
                const state = this.viewer.store.getState();
                const manifest = state.manifests[manifestId].json;
                console.debug(manifest);
                if (!manifest) { return console.error('Manifest not available from viewer store') }

                // IIIF Presentation API v3
                if (Array.isArray(manifest.items) && manifest.items[index]) {
                    canvasId = manifest.items[index].id || manifest.items[index]['@id'];
                }
                // IIIF Presentation API v2
                else if (manifest.sequences && manifest.sequences[0] && Array.isArray(manifest.sequences[0].canvases) && manifest.sequences[0].canvases[index]) {
                    canvasId = manifest.sequences[0].canvases[index].id || manifest.sequences[0].canvases[index]['@id'];
                }

                if (!canvasId) {
                    throw new Error(`Canvas at index ${index} not found in manifest ${manifestId}`);
                }
            } catch (err) {
                console.error('Error resolving canvas id from manifest:', err);
                throw err;
            }
        } else {
            // assume it's already a canvas id/IRI
            canvasId = canvasIndexOrId;
        }

        console.log("canvasID: " + canvasId)

        try {
            this.viewer.store.dispatch(Mirador.actions.setCanvas(manifestId, canvasId));
        } catch (err) {
            console.error('Failed to dispatch Mirador setCanvas action', err);
            throw err;
        }
    }
}

customElements.define("wega-mirador", WegaMirador);
