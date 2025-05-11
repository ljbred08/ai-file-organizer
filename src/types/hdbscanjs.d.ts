// hdbscanjs.d.ts  
declare module 'hdbscanjs' {  
  class Clustering {  
    constructor(dataset: Array<{data: any[], opt: any}>, distFunc?: (p1: any[], p2: any[]) => number);  
    getTree(): any;  
    static distFunc: {  
      euclidean: (p1: any[], p2: any[]) => number;  
      geoDist: (p1: any[], p2: any[]) => number;  
    };  
  }  
    
  export = Clustering;  
}