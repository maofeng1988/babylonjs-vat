import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Mesh, StandardMaterial, Texture, AnimationGroup } from "@babylonjs/core";
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

export class LivaVAT implements CreateSceneClass {
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
            "NPC_Scene.glb",
            scene,
            undefined
        );
        const npcMesh = importResult.meshes[1] as Mesh;
        (npcMesh.material as StandardMaterial).diffuseTexture = new Texture('./NPC_1.jpg', scene);
        const vat = new VAT(
            "VATliva",
            scene,
            npcMesh,
            importResult.skeletons[0],
            // importResult.animationGroups
            [
            //   importResult.animationGroups[0], 
            //   importResult.animationGroups[1], 
              importResult.animationGroups[2],
            //   importResult.animationGroups[3]
            ]
        );
        importResult.animationGroups.forEach((animG: AnimationGroup) => {
            animG.pause();
        })
        // importResult.animationGroups[2].animatables.forEach(anim => {
        //     anim.frameRa
        // })
        // importResult.animationGroups[2].normalize(0, 100);
        // importResult.animationGroups[2].play(true);
        // importResult.animationGroups[1].start();
        // importResult.animationGroups[1].goToFrame(24);
        // importResult.animationGroups[1].pause();
        vat.bakeVertexData().then(() => {
            // create instances
            for (let i = 0; i < 20; i++) {
                const instance = vat.mesh.createInstance("liva" + i);
                instance.position.x += (i - 10.0) * 2;
//重要重要重要
//-------********--------------源mesh的父级根节点scaling.x是-1，导致instance不能合批绘制，放在同一父物体下解决该问题 ---------------------
                instance.parent = npcMesh.parent; 

                // set our animation parameters.
                instance.instancedBuffers.VATanimation = new Vector4(
                    0, // start
                    vat._frames - 1, // end
                    // 0,
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
            npcMesh.isVisible = false;
        });

        scene.debugLayer.show();

        return scene;
    };
}

export default new LivaVAT();
