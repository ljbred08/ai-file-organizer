/// <reference types="node" />
declare module '@greenelab/hclust' {
 export function clusterData(params: {
 data: number[][];
 distance: (a: number[], b: number[]) => number;
 linkage: (a: number[], b: number[]) => number;
 }): { clusters: any };

 export function avgDistance(a: number[], b: number[]): number;
}
