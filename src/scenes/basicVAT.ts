import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
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
import { BaseTexture, Color3, Mesh, StandardMaterial } from "@babylonjs/core";

export class BasicVAT implements CreateSceneClass {
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

        const importResult = await SceneLoader.ImportMeshAsync(
            "",
            "/",
            "shark.glb",
            scene,
            undefined
        );
        console.log(importResult);

        const vat = new VAT("VATshark", scene, importResult.meshes[1] as Mesh, importResult.skeletons[0], [importResult.animationGroups[0]]);
        scene.stopAllAnimations();
        vat.BakeVertexData().
            then(() => {
                const oldMaterial = importResult.meshes[1].material as StandardMaterial;
                const newMaterial = vat.material;
                if (!newMaterial) {
                    throw new Error("impossible");
                }
                newMaterial.diffuseTexture = oldMaterial.diffuseTexture;
                newMaterial.specularColor = new Color3(0.0, 0.0, 0.0);
                newMaterial.ambientColor = new Color3(0.05, 0.1, 0.15);

                importResult.meshes[1].material = newMaterial;
            });


        scene.debugLayer.show();

        return scene;
    };
}

export default new BasicVAT();
