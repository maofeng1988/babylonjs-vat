import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Mesh, StandardMaterial, PBRMaterial, Texture, AnimationGroup, VertexAnimationBaker, BakedVertexAnimationManager, AbstractMesh } from "@babylonjs/core";
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
import VAT from "../vat_v2";

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

        // let npcMesh: any;
        // const importResult = await SceneLoader.ImportMeshAsync(
        //     "",
        //     "/",
        //     "NPC_Scene.glb",
        //     scene,
        //     undefined
        // )
        // .then((importResult) => {
        //   npcMesh = importResult.meshes[1];
        //   // read the vertex data file.
        //   importResult.animationGroups.forEach((ani) => {
        //     ani.stop();
        //   })
        //   return fetch('/runData.json');
        // })
        // .then(response => {
        //   if (!response.ok) {
        //       throw new Error("HTTP error " + response.status);
        //   }
        //   console.log(response)
        //   // convert to json
        //   return response.json();
        // })
        // .then(json => {
        //   // create the baker helper, so we can generate the texture
        //   console.log(json);
        //   const baker = new VertexAnimationBaker(scene, npcMesh);
        //   const vertexData = baker.loadBakedVertexDataFromJSON(JSON.stringify(json));
        //   // we got the vertex data. create the texture from it:
        //   const vertexTexture = baker.textureFromBakedVertexData(vertexData);
          
        //   // .... and now the same code as above
        //   // create a manager to store it.
        //   const manager = new BakedVertexAnimationManager(scene);
        //   // store the texture
        //   manager.texture = vertexTexture;

        //   // set the animation parameters. You can change this at any time.
        //   manager.setAnimationParameters(
        //       0, // initial frame
        //       45, // last frame
        //       0, // offset
        //       30 // frames per second
        //   );

        //   // associate the manager with the mesh
        //   npcMesh.bakedVertexAnimationManager = manager;

        //   // update the time to play the animation
        //   scene.registerBeforeRender(() => {
        //       manager.time += engine.getDeltaTime() / 1000.0;
        //   });
        // });
        const importResult = await SceneLoader.ImportMeshAsync(
          "",
          "/",
          "Avatar.glb",
          scene,
          undefined
        );
        const npcMesh: Mesh = importResult.meshes[1] as Mesh;
        // read the vertex data file.
        importResult.animationGroups.forEach((ani) => {
          ani.stop();
        })
        const response = await fetch('/avatarData.json');

        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        console.log(response)
        // convert to json
        const jsonData = await response.json();
      // create the baker helper, so we can generate the texture
          console.log(jsonData);
          const baker = new VertexAnimationBaker(scene, npcMesh);
          const vertexData = baker.loadBakedVertexDataFromJSON(JSON.stringify(jsonData));
          // we got the vertex data. create the texture from it:
          const vertexTexture = baker.textureFromBakedVertexData(vertexData);
          
          // .... and now the same code as above
          // create a manager to store it.
          const manager = new BakedVertexAnimationManager(scene);
          // store the texture
          manager.texture = vertexTexture;

          // set the animation parameters. You can change this at any time.
          manager.setAnimationParameters(
              0, // initial frame
              45, // last frame
              0, // offset
              30 // frames per second
          );

          // associate the manager with the mesh
          npcMesh.bakedVertexAnimationManager = manager;


       //const npcMesh = importResult.meshes[1] as Mesh;
       const diffuseTexture = new Texture('./Avatar_Texture.jpg', scene);
       diffuseTexture.vScale = -1;
        (npcMesh.material as PBRMaterial).albedoTexture = diffuseTexture;
        (npcMesh.material as PBRMaterial).emissiveTexture = diffuseTexture;
        (npcMesh.material as PBRMaterial).emissiveColor = new Color3(1, 1, 1);
       // create instances
        // npcMesh.registerInstancedBuffer("bakedVertexAnimationSettingsInstanced", 4);
        const childMeshArr: Mesh[] | undefined = npcMesh.parent?.getChildMeshes();
        childMeshArr && childMeshArr.forEach((m: Mesh) => {
          if(m instanceof Mesh) {
            m.registerInstancedBuffer("bakedVertexAnimationSettingsInstanced", 4);
            m.instancedBuffers.bakedVertexAnimationSettingsInstanced = new Vector4(
              0, // start
              45, // end frame
              0, // offset
              30.0 // speed in frames per second
            );
            m.isVisible = false;
            m.bakedVertexAnimationManager = manager;
          }
        })
        // npcMesh.instancedBuffers.bakedVertexAnimationSettingsInstanced = new Vector4(
        //     0, // start
        //     45, // end frame
        //     0, // offset
        //     30.0 // speed in frames per second
        // );
        // npcMesh.isVisible = false;

        const animationRanges = [
          {
              name: "Avatar_Idle",
              from: 0,
              to: 214
          },
          {
              name: "Avatar_Running",
              from: 215,
              to: 261
          },
          {
              name: "Avatar_Walking",
              from: 262,
              to: 326
          },
          {
              name: "Avatar_Waving",
              from: 327,
              to: 519
          }
      ]
        const setAnimationParameters = (vec: Vector4) => {
          const anim = animationRanges[Math.floor(Math.random() * animationRanges.length)];
          const ofst = Math.floor(Math.random() * (anim.to - anim.from + 1));
          vec.set(anim.from, anim.to, ofst, Math.random() * 50 + 30);
        };

        const numInstances = 500;
        for (let i = 0; i < numInstances; i++) {
            const npcMeshArr = [];
            const head = scene.getMeshById('Basics_Head');
            const hair = scene.getMeshById('Basics_Hair_' + Math.round(Math.random() * 7 + 1));
            const pant = scene.getMeshById('Basics_Pants_' + Math.round(Math.random() * 7 + 1));
            const shirt = scene.getMeshById('Basics_Shirt_' + Math.round(Math.random() * 7 + 1));
            if(!(head && hair && pant && shirt)) {
              break;
            }
            npcMeshArr.push(head, hair, pant, shirt);
            const instanceArr = []
            const anim = animationRanges[Math.floor(Math.random() * animationRanges.length)];
            const instanceBuffer = new Vector4(
              anim.from,
              anim.to, 
              Math.floor(Math.random() * 60), 
              30 + Math.floor(Math.random() * 60)
            )
            const pos = npcMesh.position.add(new Vector3(Math.random() * 100 - 50, 0, Math.random() * 100 - 50));
            npcMeshArr.forEach((part: any) => {
              const instance = (part as Mesh).createInstance(part.name + "_instance_" + i);
              instance.parent = npcMesh.parent; 
              try {
                instance.instancedBuffers.bakedVertexAnimationSettingsInstanced = instanceBuffer.clone();
                // setAnimationParameters(instance.instancedBuffers.bakedVertexAnimationSettingsInstanced);
                instance.position.copyFrom(pos);
              } catch (error) {
                console.log(instance);
              }
            })
            // const instance = npcMesh.createInstance("instance" + i)
            // instance.parent = npcMesh.parent; 
            // instance.instancedBuffers.bakedVertexAnimationSettingsInstanced = new Vector4(
            //   0,
            //  45, 
            //  Math.floor(Math.random() * 60), 
            //  30 + Math.floor(Math.random() * 60)
            // );
            // setAnimationParameters(instance.instancedBuffers.bakedVertexAnimationSettingsInstanced);
            // instance.position.x += Math.random() * 100 - 50;
            // instance.position.z += Math.random() * 100 - 50;
        }

        scene.registerBeforeRender(() => {
            manager.time += engine.getDeltaTime() / 1000.0;
        });
//         for (let i = 0; i < 20; i++) {
//             const instance = npcMesh.createInstance("liva" + i);
//             instance.position.x += (i - 10.0) * 2;
// //重要重要重要
// //-------********--------------源mesh的父级根节点scaling.x是-1，导致instance不能合批绘制，放在同一父物体下解决该问题 ---------------------
//             instance.parent = npcMesh.parent; 

//             // set our animation parameters.
//             // instance.instancedBuffers.VATanimation = new Vector4(
//             //     0, // start
//             //     45, // end
//             //     // 0,
//             //     i * 2, // offset
//             //     30.0 // speed in frames per second
//             // );
//         }
        // const vat = new VAT(
        //     "VATliva",
        //     scene,
        //     npcMesh,
        //     importResult.skeletons[0],
        //     // importResult.animationGroups
        //     [
        //     //   importResult.animationGroups[0], 
        //     //   importResult.animationGroups[1], 
        //       importResult.animationGroups[0],
        //     //   importResult.animationGroups[3]
        //     ]
        // );
//         importResult.animationGroups.forEach((animG: AnimationGroup) => {
//             animG.pause();
//         })
//         // importResult.animationGroups[2].animatables.forEach(anim => {
//         //     anim.frameRa
//         // })
//         // importResult.animationGroups[2].normalize(0, 100);
//         // importResult.animationGroups[2].play(true);
//         // importResult.animationGroups[1].start();
//         // importResult.animationGroups[1].goToFrame(24);
//         // importResult.animationGroups[1].pause();
//         vat.bakeVertexData().then(() => {
//             // create instances
//             for (let i = 0; i < 20; i++) {
//                 const instance = vat.mesh.createInstance("liva" + i);
//                 instance.position.x += (i - 10.0) * 2;
// //重要重要重要
// //-------********--------------源mesh的父级根节点scaling.x是-1，导致instance不能合批绘制，放在同一父物体下解决该问题 ---------------------
//                 instance.parent = npcMesh.parent; 

//                 // set our animation parameters.
//                 instance.instancedBuffers.VATanimation = new Vector4(
//                     0, // start
//                     vat._frames - 1, // end
//                     // 0,
//                     i * 2, // offset
//                     30.0 // speed in frames per second
//                 );
//             }

//             // Register a render loop to repeatedly render the scene
//             const startTime = new Date().getTime();
//             engine.runRenderLoop(() => {
//                 const endTime = new Date().getTime();
//                 const timeElapsed = (endTime - startTime) / 1000.0; // in s
//                 vat.updateTime(timeElapsed);
//                 scene.render();
//             });
//             npcMesh.isVisible = false;
//         });

        scene.debugLayer.show();

        return scene;
    };
}

export default new LivaVAT();
