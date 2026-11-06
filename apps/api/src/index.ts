console.log("👋 Hello from Orderly API")
console.log(`NodeJS Version: ${process.version}`)
console.log(`Platform: ${process.platform}`)
console.log(`PID: ${process.pid}`)

// 示範 TypeScript 型別
const greet = (name: string): string => {
  return `Welcome to Orderly, ${name}!`
}

console.log(greet("Paul"))

// 示範非同步
async function demo(): Promise<void> {
  console.log("Start demo")
  await new Promise(resolve => setTimeout(resolve, 100))
  console.log("Demo done after 100ms")
}

demo()