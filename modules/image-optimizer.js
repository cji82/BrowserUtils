/** 지원 포맷: jpeg(품질 0~1), png(무손실), webp(품질 0~1) */
export class ImageOptimizer {
  static FORMATS = {
    jpeg: { mime: 'image/jpeg', ext: 'jpg', quality: true },
    png: { mime: 'image/png', ext: 'png', quality: false },
    webp: { mime: 'image/webp', ext: 'webp', quality: true },
  };

  static optimize(file, options = {}, maxWidth = 1920) {
    const format = (options.format && this.FORMATS[options.format]) ? options.format : 'jpeg';
    const quality = typeof options.quality === 'number' ? options.quality : 0.8;
    const { mime, quality: useQuality } = this.FORMATS[format];

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const blobQuality = useQuality ? quality : undefined;
          canvas.toBlob(
            (blob) => blob ? resolve({ blob, format }) : reject(new Error('Blob 생성 실패')),
            mime,
            blobQuality
          );
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  }
}
