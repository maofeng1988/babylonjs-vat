import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import {
    AnimationGroup,
    Color3,
    Mesh,
    StandardMaterial,
} from "@babylonjs/core";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CreateSceneClass } from "../createScene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

// required imports
import "@babylonjs/inspector";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import VAT from "../vat";

export class SpiderVAT implements CreateSceneClass {
    createScene = async (
        engine: Engine,
        canvas: HTMLCanvasElement
    ): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);

        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera(
            "my first camera",
            0,
            Math.PI / 3,
            10,
            new Vector3(0, 0, 0),
            scene
        );

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        camera.useFramingBehavior = true;

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight(
            "light",
            new Vector3(0, 1, 0),
            scene
        );

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // load our model
        const importResult = await SceneLoader.ImportMeshAsync(
            "",
            "https://raw.githubusercontent.com/RaggarDK/Baby/baby/",
            "arr.babylon",
            scene,
            undefined
        );

        // create a VAT for it
        const vat = new VAT(
            "VATspider",
            scene,
            importResult.meshes[0] as Mesh,
            importResult.skeletons[0],
            []
        );

        // bake VAT.
        vat.bakeVertexData().then(() => {
            vat.mesh.setEnabled(false);
            // create instances
            for (let i = 0; i < 20; i++) {
                const instance = vat.mesh.createInstance("spider" + i);
                instance.position.x += (i - 10.0) * 2;

                // set our animation parameters.
                instance.instancedBuffers.VATanimation = new Vector4(
                    0, // start
                    100, // end
                    i * 2, // offset
                    30.0 // speed in frames per second
                );
            }

            // Register a render loop to repeatedly render the scene
            const startTime = new Date().getTime();
            engine.runRenderLoop(() => {
                const endTime = new Date().getTime();
                const timeElapsed = (endTime - startTime) / 1000.0; // in s
                vat.updateTime(timeElapsed);
                scene.render();
            });
        });

        scene.debugLayer.show();

        return scene;
    };
}

export default new SpiderVAT();
