import * as THREE from 'three';

import NodeCollection from 'core/NodeCollection';
import Display from 'core/Display';
import Effect from 'core/Effect';
import Composer from 'graphics/Composer';

const FOV = 45;
const NEAR = 1;
const FAR = 10000;
const CAMERA_POS_Z = 250;

export default class Scene extends Display {
    constructor(options) {
        super(Scene, options);

        this.owner = null;
        this.displays = new NodeCollection();
        this.effects = new NodeCollection();
    }

    update(options) {
        let changed = super.update(options);

        if (changed) {
            if (this.owner) {
                this.updatePasses();
            }

            if (this.lights && (options.lightDistance !== undefined || options.lightIntensity !== undefined)) {
                this.updateLights();
            }

            if (this.camera && options.cameraZoom !== undefined) {
                this.camera.position.z = options.cameraZoom;
            }
        }

        return changed;
    }

    addToStage(stage) {
        let size = stage.getSize();

        this.owner = stage;

        this.buffer2D = stage.buffer2D;
        this.buffer3D = stage.buffer3D;

        this.composer = new Composer(stage.renderer);
        this.graph = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(FOV, size.width/size.height, NEAR, FAR);
        this.camera.position.set(0, 0, CAMERA_POS_Z);

        this.lights = [
            new THREE.PointLight(0xffffff, 1, 0),
            new THREE.PointLight(0xffffff, 1, 0),
            new THREE.PointLight(0xffffff, 1, 0)
        ];

        this.graph.add(this.camera);
        this.graph.add(this.lights[0]);
        this.graph.add(this.lights[1]);
        this.graph.add(this.lights[2]);

        //this.graph.fog = new THREE.Fog(0x000000, NEAR, FAR);

        this.updatePasses();
        this.updateLights();
    }

    removeFromStage() {
        this.owner = null;
        this.displays.clear();
        this.displays = null;
        this.effects.clear();
        this.effects = null;
        this.composer.dispose();
        this.composer = null;
    }

    getSize() {
        return this.composer.getSize();
    }

    setSize(width, height) {
        this.getDisplays().forEach(display => {
            if (display.setSize) {
                display.setSize(width, height);
            }
        });

        this.getEffects().forEach(effect => {
            if (effect.setSize) {
                effect.setSize(width, height);
            }
        });

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.composer.setSize(width, height);
    }

    addElement(obj, index) {
        let nodes;

        if (obj instanceof Effect) {
            nodes = this.effects;
        }
        else if (obj instanceof Display) {
            nodes = this.displays;
        }

        if (index !== undefined) {
            nodes.insertNode(index, obj);
        }
        else {
            nodes.addNode(obj);
        }

        obj.owner = this;

        if (obj.addToScene) {
            obj.addToScene(this);
        }

        if (obj.setSize) {
            const { width, height } = this.owner.getSize();

            obj.setSize(width, height);
        }

        this.updatePasses();

        this.changed = true;
    }

    removeElement(obj) {
        let nodes;

        if (obj instanceof Effect) {
            nodes = this.effects;
        }
        else if (obj instanceof Display) {
            nodes = this.displays;
        }

        nodes.removeNode(obj);

        obj.owner = null;

        if (obj.removeFromScene) {
            obj.removeFromScene(this);
        }

        this.updatePasses();

        this.changed = true;
    }

    shiftElement(obj, i) {
        let nodes, index;

        if (obj instanceof Effect) {
            nodes = this.effects;
        }
        else if (obj instanceof Display) {
            nodes = this.displays;
        }

        index = nodes.indexOf(obj);

        this.changed = nodes.swapNodes(index, index + i);

        if (this.changed) {
            this.updatePasses();
        }

        return this.changed;
    }

    updatePasses() {
        let composer = this.composer;

        composer.clearPasses();
        composer.addPass(this.buffer2D.pass);
        composer.addPass(this.buffer3D.pass);

        this.getDisplays().forEach(display => {
            if (display.pass) {
                composer.addPass(display.pass);
            }
        });

        this.getEffects().forEach(effect => {
            if (effect.pass) {
                composer.addPass(effect.pass);
            }
        });
    }

    updateLights() {
        let lights = this.lights,
            intensity = this.options.lightIntensity,
            distance = this.options.lightDistance;

        lights[0].intensity = intensity;
        lights[1].intensity = intensity;
        lights[2].intensity = intensity;

        lights[0].position.set(0, distance * 2, 0);
        lights[1].position.set(distance, distance * 2, distance);
        lights[2].position.set(-distance, -distance * 2, -distance);
    }

    getDisplays() {
        return this.displays.nodes;
    }

    getEffects() {
        return this.effects.nodes;
    }

    getContext(type) {
        return (type === 'webgl') ?
            this.buffer3D.context :
            this.buffer2D.context;
    }

    clear() {
        this.buffer2D.clear();
        this.buffer3D.clear();
        this.composer.clearBuffer();
    }

    render(data) {
        let displays = this.getDisplays(),
            effects = this.getEffects(),
            composer = this.composer,
            hasGeometry = false;

        this.clear();

        if (displays.size > 0 || effects.size > 0) {
            displays.forEach(display => {
                if (display.options.enabled) {
                    display.renderToScene(this, data);

                    if (!hasGeometry && display.hasGeometry) {
                        hasGeometry = true;
                    }
                }
            });

            if (hasGeometry) {
                this.buffer3D.renderer.render(this.graph, this.camera);
            }

            effects.forEach(effect => {
                if (effect.options.enabled) {
                    effect.renderToScene(this, data);
                }
            });

            composer.render();
        }

        return composer.readBuffer;
    }

    toJSON() {
        let displays = this.getDisplays().map(display => {
            return display.toJSON();
        });

        let effects = this.getEffects().map(effect => {
            return effect.toJSON();
        });

        return {
            name: this.name,
            options: this.options,
            displays: displays,
            effects: effects
        };
    }

    hasChanges() {
        if (this.changed) {
            return true;
        }

        let changes = false;

        this.getDisplays().forEach(display => {
            if (!changes && display.changed) {
                changes = true;
            }
        });

        return changes;
    }

    resetChanges() {
        this.changed = false;

        this.getDisplays().forEach(display => {
            display.changed = false;
        });
    }
}

Scene.label = 'Scene';

Scene.className = 'Scene';

Scene.defaults = {
    blendMode: 'Normal',
    opacity: 1.0,
    lightIntensity: 1.0,
    lightDistance: 500,
    cameraZoom: 250,
    mask: false,
    inverse: false,
    stencil: false
};