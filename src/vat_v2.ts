import {
    AnimationGroup,
    Color3,
    Mesh,
    RawTexture,
    Scene,
    Skeleton,
    Texture,
    Vector4,
    BakedVertexAnimationManager,
    VertexAnimationBaker
} from "@babylonjs/core";
import { CustomMaterial } from "@babylonjs/materials";

/**
 * Vertex Animation Texture implementation. Bakes the animation into a Texture
 * that is used by shaders to do animation on the GPU instead of the CPU.
 */
class VAT {
    /** defines the VAT name */
    name: string;

    scene: Scene;
    mesh: Mesh;
    skeleton: Skeleton;
    animationGroups: AnimationGroup[];

    /** the vertex data, arrays of floats for the matrices */
    vertexData: Float32Array | null;

    /** the actual texture */
    boneTexture: RawTexture | null;

    /** a material applying the VAT */
    material: CustomMaterial | null;

    /** current animationGroup index in animationGroups */
    _animGroupIndex = 0;

    /** total number of frames in our animations */
    frameCount = 0;

    /** total number of bones */
    boneCount = 0;

    /** current frame of the baking process */
    _frameIndex = 0;

    /** Current index for the texture in the baking process (linear counter) */
    _textureIndex = 0;

    /** test param */
    _frames = 46;

    /** animation ranges */
    _animationRanges = [
      {
        name: '',
        from: 0,
        to: 0,
      }
    ];

    /**
     *
     * @param name Defines the name of the VAT
     * @param scene Defines the scene the VAT belongs to
     * @param mesh Defines the mesh the VAT belongs to
     * @param skeleton Defines the skeleton the VAT belongs to
     * @param animationGroups Defines the animation groups to be rendered by this VAT
     */
    constructor(
        name: string,
        scene: Scene,
        mesh: Mesh,
        skeleton: Skeleton,
        animationGroups: AnimationGroup[]
    ) {
        this.vertexData = null;
        this.name = name;
        this.scene = scene;
        this.mesh = mesh;
        this.skeleton = skeleton;
        this.animationGroups = animationGroups;
        this.boneTexture = null;
        this.material = null;
        let framenum = 0;
        animationGroups.forEach((ani: AnimationGroup, index: number) => {
          this._animationRanges[index] = {
            name: ani.name,
            from: framenum,
            to: Math.round(framenum + (ani.to - ani.from))
          }
          framenum += Math.round(ani.to - ani.from + 1);
        })
        console.log(this._animationRanges);
    }
    /**
     * Bakes the animation into the texture. This should be called once, when the
     * scene starts, so the VAT is generated and associated to the mesh.
     * @returns Promise
     */
    public bakeVertexData(): Promise<void> {
        // this.frameCount = Math.round(this.animationGroups[0].to - this.animationGroups[0].from + 1);
        let frameCounts = 0;
        this.animationGroups.forEach((ani) => {
          frameCounts += Math.round(ani.to - ani.from + 1);
        })
        this.boneCount = this.skeleton.bones.length;
        this.vertexData = new Float32Array(
          (this.boneCount + 1) * 4 * 4 * frameCounts
            // (this.boneCount + 1) * 4 * 4 * this.frameCount * this.animationGroups.length
        );

        const promise = new Promise<void>((resolve, reject) => {
            this._frameIndex = 0;
            this._textureIndex = 0;
            this.scene.stopAnimation(this.mesh);
            this.scene.render();
            this._executeAnimationFrame(() => {
                // at this point we have the vertex data, so convert it to an actual texture
                // and build a material
                this.scene.stopAnimation(this.mesh);
                this.mesh.skeleton?.returnToRest();
                this.rebuild();
                resolve();
            });
        });

        return promise;
    }
    /**
     * Rebuilds textures and materials, and applies it to the mesh.
     * @returns Self.
     */
    public rebuild(): VAT {
        this._buildTexture();
        this._buildMaterial();
        this._applyBakedVertexDataToMesh();
        // this.vertexData = null;
        return this;
    }
    /**
     * Runs an animation frame and stores its vertex data
     * @param callback
     */
    private async _executeAnimationFrame(callback: Function): Promise<void> {
        try {
          for(let j = 0; j < this.animationGroups.length; j++) {
            this._animGroupIndex = j;
            let frameCountBase = 0;
            for(let k = 0; k < j; k++) {
              frameCountBase += Math.round(this.animationGroups[k].to - this.animationGroups[k].from + 1);
            }
            if(this.animationGroups[j]) {
              const frameCount = Math.round(this.animationGroups[j].to - this.animationGroups[j].from + 1);
              console.log('frameCount: ', frameCount);
              this._frames = frameCount + 1;
              const testFunc = function() {
                  return new Promise((resolve) => {
                      setTimeout(function(){
                         console.log("testAwait", Date.now());
                         resolve(null);
                      }, 30);
                  });
               }
               
              for(let i = 0; i< frameCount; i++) {
                  this.scene.render();
                  this.animationGroups[j].play();
                  this.animationGroups[j].goToFrame(i);
                  this.animationGroups[j].stop();
                  
                  if (!this.mesh.skeleton || !this.vertexData) {
                      throw new Error("No skeleton.");
                  }
                  await testFunc()
                  // generate matrices
                  const skeletonMatrices =
                      this.mesh.skeleton.getTransformMatrices(this.mesh);
                  
                  this.vertexData.set(
                      skeletonMatrices,
                      this._textureIndex * skeletonMatrices.length + frameCountBase * skeletonMatrices.length
                  );
  
                  this._frameIndex++;
                  this._textureIndex++;
                  
                  if (this._textureIndex >= frameCount) {
                    console.log(this.vertexData);
                    this._frameIndex = 0;
                    this._textureIndex = 0;
                    // callback();
                  }
              }
              // this._frameIndex = 0;
              // this._textureIndex = 0;
            }
          }
          console.log(this.vertexData?.length);
            this.scene.beginAnimation(
                this.mesh.skeleton,
                0,
                0,
                false,
                1.0,
                () => {
                    callback();
                    const baker = new VertexAnimationBaker(this.scene, this.mesh);
                    if(!this.vertexData) {
                      return;
                    }
                    // const vertexTexture = baker.textureFromBakedVertexData(this.vertexData);
                    // const manager = new BakedVertexAnimationManager(this.scene);

                    // manager.texture = vertexTexture;
                    // manager.animationParameters = new Vector4(
                    //   this.animationGroups[0].from,
                    //   this.animationGroups[0].to,
                    //   0, 
                    //   30
                    // );
                    // this.mesh.bakedVertexAnimationManager = manager;
                    // manager.setAnimationParameters(this.animationGroups[0].from, this.animationGroups[0].to,
                    //   0, 60);
                    // this.scene.registerBeforeRender(() => {
                    //   manager.time += this.scene.getEngine().getDeltaTime() / 1000.0;
                    // });
                    // we got the vertex data. let's serialize it:

                    // const vertexDataJSON = baker.serializeBakedVertexDataToJSON(this.vertexData);
                    console.log(this.vertexData);
                    const vertexDataJSON = baker.serializeBakedVertexDataToJSON(this.vertexData);
                    // const vertexDataJSON = this.serializeBakedJSON();
                    // console.log('vertexDataJson: ', vertexDataJSON);
                    // and save it to a local JSON file

                    const a = document.createElement('a');
                    console.log('vertexDataJSON: ', vertexDataJSON)
                    a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(vertexDataJSON));
                    a.setAttribute("download", "vertexData.json");
                    a.click();
                }
            );
        } catch (error) {
           console.log(this.frameCount, this._frameIndex) 
        }
        
    }
    /**
     * Serializes our vertexData to an object, with a nice string for the vertexData.
     * Should be called right after bakeVertexData(), since we release the vertexData
     * from memory on rebuild().
     * @returns Object
     */
    public serializeBakedObject(): Record<string, any> {
        if (!this.vertexData) {
            throw new Error("No vertex data");
        }
        // this converts the float array to a serialized base64 string, ~1.3x larger
        // than the original.
        const data = {
            vertexData: Buffer.from(
                String.fromCharCode(...new Uint8Array(this.vertexData.buffer)),
                "base64"
            ),
        };
        return data;
    }
    /**
     * Loads previously baked data.
     * @returns self
     */
    public loadBakedObject(data: Record<string, any>): VAT {
        this.vertexData = new Float32Array(
            new Uint8Array(
                [...Buffer.from(data.vertexData, "base64")].map((c) =>
                    (c as any as string).charCodeAt(0)
                )
            ).buffer
        );
        return this;
    }
    /**
     * Serializes our vertexData to a JSON string, with a nice string for the vertexData.
     * Should be called right after bakeVertexData(), since we release the vertexData
     * from memory on rebuild().
     * @returns string
     */
    public serializeBakedJSON(): string {
        return JSON.stringify(this.serializeBakedObject());
    }
    /**
     * Loads previously baked data.
     * @returns self
     */
    public loadBakedJSON(json: string): VAT {
        return this.loadBakedJSON(JSON.parse(json));
    }
    /**
     * Builds the texture from an existing vertexData.
     * @return self
     */
    public _buildTexture(): VAT {
        if (!this.vertexData) {
            throw new Error("No vertex data");
        }
        this.boneTexture = RawTexture.CreateRGBATexture(
            this.vertexData,
            (this.boneCount + 1) * 4,
            // this.frameCount,
            this.frameCount * Math.max(this.animationGroups.length, 1),
            this.scene,
            false,
            false,
            Texture.NEAREST_NEAREST,
            1
        );
        console.log('boneTexture: ', this.boneTexture);
        this.boneTexture.name = this.name + "texture";
        return this;
    }
    /**
     *
     */
    public _applyBakedVertexDataToMesh(): void {
        if (!this.material) {
            throw new Error("No material");
        }
        // build the material and assign it to the mesh
        this.mesh.registerInstancedBuffer("VATanimation", 4);
        this.mesh.instancedBuffers.VATanimation = new Vector4(
            0, // start
            45, // end frame
            0, // offset
            30.0 // speed in frames per second
        );
        this.mesh.material = this.material;
    }

    public updateTime(time: number): void {
        this.material?.getEffect().setFloat("time", time);
    }

    /**
     * Builds a material for the animation.
     * @returns The material
     */
    public _buildMaterial(): CustomMaterial {
        const mat = new CustomMaterial(this.name, this.scene);
        // mat.AddUniform("singleFrameUVPer", "float", 1 / this.frameCount);
        mat.AddUniform("singleFrameUVPer", "float", 1 / (this.frameCount * Math.max(this.animationGroups.length, 1)));
        mat.AddUniform("boneSampler1", "sampler2D", this.boneTexture);
        mat.AddUniform("time", "float", 0.0);
        mat.AddAttribute("VATanimation");

        // some temporary material colors just to show things are working
        mat.specularColor = new Color3(0.0, 0.0, 0.0);
        mat.ambientColor = new Color3(0.05, 0.1, 0.15);
        // if we have a diffuse texture, reapply it
        if (this.mesh.material && "diffuseTexture" in this.mesh.material) {
            mat.diffuseTexture = (this.mesh.material as any).diffuseTexture;
        }

        // sample from the texture
        mat.Vertex_Definitions(
            /*glsl*/`
              attribute vec4 VATanimation;

              mat4 readMatrixFromRawSampler1(sampler2D smp, float index, float frame, float bTW)
              {
                  float offset = index * 4.0;
                  float dx = 1.0 / bTW;
                  float frameUV = frame*singleFrameUVPer;
                  vec4 m0 = texture2D(smp, vec2(dx * (offset + 0.5), frameUV));
                  vec4 m1 = texture2D(smp, vec2(dx * (offset + 1.5), frameUV));
                  vec4 m2 = texture2D(smp, vec2(dx * (offset + 2.5), frameUV));
                  vec4 m3 = texture2D(smp, vec2(dx * (offset + 3.5), frameUV));
                  return mat4(m0, m1, m2, m3);
              }
              `
        );

        mat.Vertex_MainBegin(
            /*glsl*/`
              float VATStartFrame = VATanimation.x;
              float VATEndFrame = VATanimation.y;
              float VATOffsetFrame = VATanimation.z;
              float VATSpeed = VATanimation.w;

              // get number of frames
              float _numOfFrames = VATEndFrame - VATStartFrame + 1.0;
              // convert frame offset to secs elapsed
              float offsetCycle = VATOffsetFrame / VATSpeed;
              // add offset to time to get actual time, then
              // compute time elapsed in terms of frame cycle (30 fps/180 frames = 1/6 of an animation cycle per second)
              // so 0.5s = 0.08333 of an animation cycle, 7.5s = 1.25 of an animation cycle etc
              float frameNum = fract( (time + offsetCycle) * VATSpeed / _numOfFrames );
              // convert to actual frame
              frameNum *= _numOfFrames;
              // round it to integer
              frameNum = ceil(frameNum);
              // add to start frame
              frameNum += VATStartFrame;
            `
        );

        // apply position
        mat.Vertex_After_WorldPosComputed(
            /*glsl*/`
              mat4 influence1;
              influence1 = readMatrixFromRawSampler1(boneSampler1, matricesIndices[0], frameNum, boneTextureWidth) * matricesWeights[0];
              influence1 += readMatrixFromRawSampler1(boneSampler1, matricesIndices[1], frameNum, boneTextureWidth) * matricesWeights[1];
              influence1 += readMatrixFromRawSampler1(boneSampler1, matricesIndices[2], frameNum, boneTextureWidth) * matricesWeights[2];
              influence1 += readMatrixFromRawSampler1(boneSampler1, matricesIndices[3], frameNum, boneTextureWidth) * matricesWeights[3];
              finalWorld = finalWorld * influence1;
              worldPos = finalWorld * vec4(positionUpdated, 1.0);
            `
        );

        mat.onBindObservable.add(() => {
            // TODO: this should run only once
            mat.getEffect()
                .setFloat("singleFrameUVPer", 1 / (this.frameCount * Math.max(this.animationGroups.length, 1)))
                // .setFloat("singleFrameUVPer", 1 / this.frameCount)
                .setTexture("boneSampler1", this.boneTexture);
        });

        this.material = mat;
        return mat;
    }
}

export default VAT;
