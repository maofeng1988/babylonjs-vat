import { AnimationGroup, Mesh, RawTexture, Scene, Skeleton, TargetedAnimation, Texture } from "@babylonjs/core";
import { CustomMaterial } from "@babylonjs/materials";

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

    /** counter for the baking process */
    _frameIndex = 0;

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

    public BakeVertexData(): Promise<void> {
        const animationLengths = this.animationGroups.map(
            (ag: AnimationGroup) => ag.targetedAnimations.map(
                (a: TargetedAnimation) => a.animation.getKeys().length
            )[0]
        );

        // allocate our texture
        this.frameCount = animationLengths.reduce((previous, current) => previous + current);
        this.boneCount = this.skeleton.bones.length;
        this.vertexData = new Float32Array(
            (this.boneCount + 1) * 4 * 4 * this.frameCount
        );

        const promise = new Promise<void>((resolve, reject) => {
            this._frameIndex = 0;
            this.scene.stopAnimation(this.mesh);
            this.scene.render();
            this.executeAnimationFrame(() => {
                // at this point we have the vertex data, so convert it to an actual texture
                // and build a material
                this.BuildTexture();
                this.BuildMaterial();
                resolve();
            })
        })

        return promise;
    }

    private executeAnimationFrame(callback: Function): void {
        this.scene.beginAnimation(this.skeleton, this._frameIndex, this._frameIndex, false, 1.0, () => {
            this.scene.render()
            const skeletonMatrices = this.skeleton.getTransformMatrices(this.mesh);
            this.vertexData?.set(skeletonMatrices, this._frameIndex * skeletonMatrices.length);

            this._frameIndex++;

            if(this._frameIndex < this.frameCount){
                this.executeAnimationFrame(callback);
            } else {
                callback();
            }
        });
    }

    public LoadBakedJSON(json: string): VAT {
        // TODO
        return this;
    }

    public SerializeBakedJSON(): string {
        // TODO
        return "";
    }

    public LoadBakedRaw(json: string): VAT {
        // TODO
        return this;
    }

    public SerializeBakedRaw(): string {
        // TODO
        return "";
    }

    public BuildTexture(): void {
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
    }

    public ApplyBakedVertexDataToMesh(): void {
        // build the material and assign it to the mesh
        this.mesh.registerInstancedBuffer("VAT", 4);
        const mat = this.BuildMaterial();
        this.mesh.material = mat;
    }

    public BuildMaterial(): CustomMaterial {
        let time = 0;
        const mat = new CustomMaterial(this.name, this.scene);
        mat.AddUniform("singleFrameUVPer", "float",  1 / this.frameCount);
        mat.AddUniform("boneSampler1", "sampler2D", this.boneTexture);
        mat.AddUniform("time", "float", 0.0);
        mat.AddAttribute("anim");

        // sample from the texture
        mat.Vertex_Definitions(
            `
attribute vec4 anim;

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
// get number of frames
float _numOfFrames = anim.y - anim.x;
// convert frame offset to secs elapsed
float offsetCycle = anim.z / anim.w;
// add offset to time to get actual time, then
// compute time elapsed in terms of frame cycle (30 fps/180 frames = 1/6 of an animation cycle per second)
// so 0.5s = 0.08333 of an animation cycle, 7.5s = 1.25 of an animation cycle etc
float frameNum = fract((time+ offsetCycle) * anim.w / _numOfFrames);
// convert to actual frame
frameNum *= _numOfFrames;
// round it to integer
frameNum = ceil(frameNum);
// add to start frame
frameNum += anim.x;
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
            time += 0.01; // TODO
            const e = mat.getEffect();
            e.setFloat("singleFrameUVPer", 1 / this.frameCount);
            e.setTexture("boneSampler1", this.boneTexture);
            e.setFloat("time", time);
        });

        this.material = mat;
        return mat;
    }
}

export default VAT;