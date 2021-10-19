import {
    AnimationGroup,
    Color3,
    Mesh,
    RawTexture,
    Scene,
    Skeleton,
    Texture,
    Vector4,
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

    /** total number of frames in our animations */
    frameCount = 0;

    /** total number of bones */
    boneCount = 0;

    /** current frame of the baking process */
    _frameIndex = 0;

    /** Current index for the texture in the baking process (linear counter) */
    _textureIndex = 0;

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
    }
    /**
     * Bakes the animation into the texture. This should be called once, when the
     * scene starts, so the VAT is generated and associated to the mesh.
     * @returns Promise
     */
    public bakeVertexData(): Promise<void> {
        // const animationLengths = this.animationGroups.map(
        //     (ag: AnimationGroup) =>
        //         ag.targetedAnimations.map(
        //             (a: TargetedAnimation) => a.animation.getKeys().length
        //         )[0]
        // );

        // allocate our texture
        this.frameCount = 100;
        // animationLengths.reduce((previous, current) => previous + current);
        this.boneCount = this.skeleton.bones.length;
        this.vertexData = new Float32Array(
            (this.boneCount + 1) * 4 * 4 * this.frameCount
        );

        const promise = new Promise<void>((resolve, reject) => {
            this._frameIndex = 7;
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
        this.vertexData = null;
        return this;
    }
    /**
     * Runs an animation frame and stores its vertex data
     * @param callback
     */
    private _executeAnimationFrame(callback: Function): void {
        this.scene.beginAnimation(
            this.mesh.skeleton,
            this._frameIndex,
            this._frameIndex,
            false,
            1.0,
            () => {
                this.scene.render();
                if (!this.mesh.skeleton || !this.vertexData) {
                    throw new Error("No skeleton.");
                }

                // generate matrices
                const skeletonMatrices =
                    this.mesh.skeleton.getTransformMatrices(this.mesh);
                this.vertexData.set(
                    skeletonMatrices,
                    this._textureIndex * skeletonMatrices.length
                );

                // TODO: frameIndex should match the animation ranges, there might be skips
                this._frameIndex++;
                this._textureIndex++;

                if (this._textureIndex < this.frameCount) {
                    this._executeAnimationFrame(callback);
                } else {
                    callback();
                }
            }
        );
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
            this.frameCount,
            this.scene,
            false,
            false,
            Texture.NEAREST_NEAREST,
            1
        );
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
            this.frameCount - 1, // end frame
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
        mat.AddUniform("singleFrameUVPer", "float", 1 / this.frameCount);
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
            `
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
            `
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
float frameNum = fract((time + offsetCycle) * VATSpeed / _numOfFrames);
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
            `
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
                .setFloat("singleFrameUVPer", 1 / this.frameCount)
                .setTexture("boneSampler1", this.boneTexture);
        });

        this.material = mat;
        return mat;
    }
}

export default VAT;
