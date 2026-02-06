export class TimeConverter {
  static timestampToDate(timestamp) {
    const ts = String(timestamp).length <= 10 ? Number(timestamp) * 1000 : Number(timestamp);
    const d = new Date(ts);
    if (isNaN(d.getTime())) throw new Error('유효하지 않은 타임스탬프');
    return d.toLocaleString('ko-KR');
  }

  static dateToTimestamp(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) throw new Error('유효하지 않은 날짜');
    return Math.floor(d.getTime() / 1000);
  }

  static convert(input) {
    const trimmed = String(input).trim();
    if (/^\d+$/.test(trimmed)) {
      return { type: 'date', value: this.timestampToDate(trimmed) };
    }
    return { type: 'timestamp', value: this.dateToTimestamp(trimmed) };
  }
}
