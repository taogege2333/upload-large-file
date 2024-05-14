<template>
  <main>
    <input type="file" @change="onFileChange" />
    <button @click="upload">上传</button>
    <img v-show="imageUrl" :src="imageUrl">
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const SIZE = Math.pow(1024, 2)
let file: File | null = null
let fileName = ''
const imageUrl = ref('')

// 待上传文件改变
const onFileChange = (event: Event) => {
  file = ((event?.target as any).files[0] as File)
  fileName = `${Date.now()}-${file.name}`
}

// 上传文件
const upload = () => {
  if (file === null) return alert('请选择文件')
  if (file.size <= SIZE && /(jpg|png|gif|bmp|jpeg)/.test(fileName.split('.').pop() || '')) {
    alert(`请上传大小超过${SIZE / Math.pow(1024, 2)}MB的图片`)
  } else {
    // 切片
    const sliceList = sliceFile(file, SIZE)
    // 上传
    uploadFile(sliceList)
  }
}

// 文件切片
const sliceFile = (file: File, size: number): sliceType[] => {
  let curr = 0
  let index = 0
  const sliceList: sliceType[] = []
  while(curr <= file.size) {
    sliceList.push({
      file: file.slice(curr, curr + size),
      fileName: fileName,
      chunkName: `${fileName}-${index + 1}`,
      index
    })
    index++
    curr += size
  }
  return sliceList
}

// 上传文件
const uploadFile = (sliceList: sliceType[]) => {
  const requests = []
  for (let slice of sliceList) {
    const form = new FormData()
    form.append('file', slice.file)
    form.append('fileName', slice.fileName)
    form.append('chunkName', slice.chunkName)
    requests.push(fetch('http://localhost:3000/uploadChunk', {
      method: 'post',
      body: form,
    }))
  }
  Promise.all(requests)
    .then(() => {
      // 发送合并请求
      fetch('http://localhost:3000/megerChunks', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName,
          size: SIZE
        }),
      }).then(async response => {
        const { url } = await response.json()
        imageUrl.value = url
      }).catch(error => console.log(error))
    })
    .catch((error) => {
      console.log(error)
    })
}
</script>

<style scoped>
img {
  width: 100%;
}
</style>
