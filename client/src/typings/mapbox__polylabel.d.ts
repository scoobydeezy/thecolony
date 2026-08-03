declare module '@mapbox/polylabel' {
  function polylabel(polygon: number[][][], precision?: number): [number, number];
  export default polylabel;
}
