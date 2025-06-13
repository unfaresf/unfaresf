export default function getDateMinusNHours(n: number) {
  const now = new Date();
  now.setHours(now.getHours() - n);
  return now;
}