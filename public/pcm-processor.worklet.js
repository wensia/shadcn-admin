/**
 * AudioWorklet 处理器: 将麦克风 Float32 音频转为 PCM int16 LE。
 *
 * - 输入: AudioWorkletProcessor 128 帧 Float32 数据 (通常 48kHz)
 * - 下采样到 16kHz
 * - 累积到 320 samples (20ms @ 16kHz) 后 postMessage 发送
 */

const TARGET_SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 320; // 20ms @ 16kHz
const FRAME_BYTES = FRAME_SAMPLES * 2; // int16 = 2 bytes per sample

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(FRAME_SAMPLES);
    this._offset = 0;
    this._ratio = sampleRate / TARGET_SAMPLE_RATE;
    // 下采样的残余位置追踪
    this._srcPos = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const ratio = this._ratio;

    for (let i = 0; i < channelData.length; i++) {
      this._srcPos++;
      // 每 ratio 个源样本取一个目标样本
      if (this._srcPos >= ratio) {
        this._srcPos -= ratio;

        // 裁剪到 [-1, 1] 并转为 int16
        const s = Math.max(-1, Math.min(1, channelData[i]));
        this._buffer[this._offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;

        if (this._offset >= FRAME_SAMPLES) {
          // 发送一帧 PCM 数据 (int16 LE)
          const frame = new ArrayBuffer(FRAME_BYTES);
          const view = new DataView(frame);
          for (let j = 0; j < FRAME_SAMPLES; j++) {
            view.setInt16(j * 2, this._buffer[j], true);
          }
          this.port.postMessage(frame, [frame]);
          this._offset = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
