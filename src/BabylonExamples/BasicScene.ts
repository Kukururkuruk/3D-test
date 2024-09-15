import {
  Scene,
  Engine,
  SceneLoader,
  Vector3,
  HemisphericLight,
  FreeCamera,
  ActionManager,
  ExecuteCodeAction,
  AbstractMesh,
  PointerDragBehavior,
} from "@babylonjs/core";
import "@babylonjs/loaders";

export class BasicScene {
  scene: Scene;
  engine: Engine;
  ramp: AbstractMesh;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(this.canvas, true);
    this.scene = this.CreateScene();

    this.CreateEnvironment();
    this.CreateController();

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Добавляем кнопки управления записью
    this.setupRecordingControls();
  }

  CreateScene(): Scene {
    const scene = new Scene(this.engine);
    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);

    const framesPerSecond = 60;
    const gravity = -9.81;
    scene.gravity = new Vector3(0, gravity / framesPerSecond, 0);
    scene.collisionsEnabled = true;

    return scene;
  }

  async CreateEnvironment(): Promise<void> {
    const { meshes } = await SceneLoader.ImportMeshAsync(
      "",
      "./models/",
      "Prototype_Level.glb",
      this.scene
    );

    this.ramp = meshes[8]; // Подставьте нужный индекс для рампы

    meshes.forEach((mesh) => {
      mesh.checkCollisions = true;
    });

    this.setupRampInteraction();
  }

  CreateController(): void {
    const camera = new FreeCamera("camera", new Vector3(0, 10, 0), this.scene);
    camera.attachControl(this.canvas, false);

    camera.applyGravity = true;
    camera.checkCollisions = true;
    camera.ellipsoid = new Vector3(1, 2, 1);
    camera.minZ = 0.45;
    camera.speed = 0.75;
    camera.angularSensibility = 4000;
    camera.keysUp.push(87); // W
    camera.keysLeft.push(65); // A
    camera.keysDown.push(83); // S
    camera.keysRight.push(68); // D
  }

  setupRampInteraction(): void {
    if (!this.ramp) return;

    this.ramp.actionManager = new ActionManager(this.scene);

    this.ramp.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        this.canvas.style.cursor = "pointer";
      })
    );

    this.ramp.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        this.canvas.style.cursor = "default";
      })
    );

    const dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) });
    dragBehavior.useObjectOrientationForDragging = false;
    this.ramp.addBehavior(dragBehavior);
  }

  setupRecordingControls(): void {
    // Создаем кнопки записи
    const startButton = document.createElement("button");
    startButton.textContent = "Start Recording";
    startButton.style.position = "absolute";
    startButton.style.top = "10px";
    startButton.style.left = "10px";

    const stopButton = document.createElement("button");
    stopButton.textContent = "Stop Recording";
    stopButton.style.position = "absolute";
    stopButton.style.top = "10px";
    stopButton.style.left = "120px";

    document.body.appendChild(startButton);
    document.body.appendChild(stopButton);

    startButton.onclick = () => this.startRecording();
    stopButton.onclick = () => this.stopRecording();
  }

  startRecording(): void {
    if (!this.canvas) return;

    // Захватываем поток с canvas
    const stream = this.canvas.captureStream(30); // 30 fps
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();
      URL.revokeObjectURL(url);
    };

    this.recordedChunks = [];
    this.mediaRecorder.start();
    console.log("Recording started");
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      console.log("Recording stopped");
    }
  }
}
