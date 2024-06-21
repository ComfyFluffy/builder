// TypeScript does not include the AudioWorkletProcessor type

class SumProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    const inputChannel = input[0]
    const outputChannel = output[0]
    if (!inputChannel || !outputChannel) {
      return false
    }

    let sum = 0
    for (let i = 0; i < inputChannel.length; i++) {
      outputChannel[i] = inputChannel[i]
      sum += Math.abs(inputChannel[i])
    }
    this.port.postMessage({
      sum,
      length: inputChannel.length
    })
    return true
  }
}
registerProcessor('sum-processor', SumProcessor)
