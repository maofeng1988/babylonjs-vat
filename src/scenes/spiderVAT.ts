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

        // const importResult = await SceneLoader.ImportMeshAsync(
        //     "",
        //     "/",
        //     "shark.glb",
        //     scene,
        //     undefined
        // );

        const importResult = await SceneLoader.ImportMeshAsync(
            "",
            "https://raw.githubusercontent.com/RaggarDK/Baby/baby/",
            "arr.babylon",
            scene,
            undefined
        );

        console.log(importResult);

        const mesh = importResult.meshes[0] as Mesh;
        const oldMaterial = mesh.material as StandardMaterial;
        const vat = new VAT(
            "VATspider",
            scene,
            mesh,
            importResult.skeletons[0],
            []
        );
        (window as any).vat = vat;
        vat.BakeVertexData().then(() => {
            console.log(vat);

            // for (let i = 0; i < 20; i++) {
            //     const instance = vat.mesh.createInstance("shark" + i);
            //     instance.position.y += i;
            //     instance.instancedBuffers.VAT = new Vector4(
            //         0, // start
            //         50, // end
            //         0, // offset
            //         1.0 //
            //     );
            // }
        });

        scene.debugLayer.show();

        // Register a render loop to repeatedly render the scene
        engine.runRenderLoop(() => {
            scene.render();
        });

        return scene;
    };
}

export default new SpiderVAT();
