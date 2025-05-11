import * as vectraDb from './vectra-db';
import Clustering from 'hdbscanjs';
import { clusterData as hclustClusterData, avgDistance } from '@greenelab/hclust'; // Import for hclust

// Custom cosine distance function (remains the same)
const cosineDistance = (p1: number[], p2: number[]) => {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  if (p1.length !== p2.length) {
    throw new Error('unequal dimension in input data');
  }

  for (let i = 0; i < p1.length; i++) {
    dotProduct += p1[i] * p2[i];
    magnitude1 += p1[i] * p1[i];
    magnitude2 += p2[i] * p2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 1.0; // Maximum distance if one vector is zero
  }

  const similarity = dotProduct / (magnitude1 * magnitude2);
  return 1 - similarity; // Cosine distance is 1 - cosine similarity
};

export async function performClustering(clusteringAlgorithm = 'hclust') { // Added algorithm parameter
  const embeddings = await vectraDb.listItems();

  // Original dataset format for hdbscanjs and for easy metadata access
  const datasetWithMetadata = embeddings.map((item, index) => {
    return { data: item.vector, opt: { index, metadata: item.metadata } };
  });

  // Data format for @greenelab/hclust (array of vectors)
  const hclustDataset = embeddings.map(item => item.vector);
  // Store metadata separately for hclust to reference by index
  const hclustMetadata = embeddings.map(item => item.metadata);


  let treeNode;
  let visualData;

  if (clusteringAlgorithm === 'hdbscan') {
    console.log("Performing HDBSCAN clustering...");
    const cluster = new Clustering(datasetWithMetadata, cosineDistance);
    treeNode = cluster.getTree();
    // visualData = toVisualizationFormatHdbscan(treeNode); // Use original visual format for hdbscan
    // console.log("\nHDBSCAN Visualization data:", JSON.stringify(visualData, null, 2));
    printTreeAsciiHdbscan(treeNode); // Use original print tree for hdbscan
    return treeNode;

  } else if (clusteringAlgorithm === 'hclust') {
    console.log("Performing Hierarchical (hclust) clustering...");
    const { clusters } = hclustClusterData({
      data: hclustDataset,
      distance: cosineDistance, // Use the same cosine distance
      linkage: avgDistance, // Use the built-in avgDistance function
    });
    treeNode = clusters; // The root of the hclust tree

    // visualData = toVisualizationFormatHclust(treeNode, hclustMetadata);
    // console.log("\nHclust Visualization data:", JSON.stringify(visualData, null, 2));
 printTreeAsciiHclust(treeNode, hclustMetadata);

 return treeNode; // Return the hclust tree structure
  } else {
    console.error("Unsupported clustering algorithm:", clusteringAlgorithm);
    return null;
  }
}

// --- HDBSCAN Specific Helper Functions ---
function toVisualizationFormatHdbscan(node: any): any {
 if (!node) return null;
  return {
    name: node.opt && node.opt[0] && node.opt[0].metadata ? node.opt[0].metadata.filename : `Cluster (size ${node.opt ? node.opt.length : 0})`,
    children: [
      node.left ? toVisualizationFormatHdbscan(node.left) : null,
      node.right ? toVisualizationFormatHdbscan(node.right) : null
    ].filter(Boolean)
  };
}

function printTreeAsciiHdbscan(node: any, prefix = "", isLeft = true) {
  if (!node) return;

  let nodeName = "Unknown";
  try {
    // For internal nodes of hdbscanjs, opt might be an array of original items
    if (node.opt && node.opt.length > 0 && node.opt[0].metadata && node.opt[0].metadata.filename) {
        // If it's a leaf or small cluster, it might have filename directly
        if (node.opt.length === 1) {
            nodeName = node.opt[0].metadata.filename;
        } else {
             // For internal nodes, show cluster size, you could list all filenames if desired
            nodeName = `Cluster (size ${node.opt.length})`;
        }
    } else if (node.isLeaf) { // hdbscanjs specific check
        nodeName = `Leaf ${node.opt.index} (${node.opt.metadata.filename})`;
    }
     else {
        // Fallback for internal nodes or nodes without expected metadata structure
        const size = node.opt ? node.opt.length : (node.data ? node.data.length : 'N/A');
        nodeName = `Cluster (size ${size})`;
    }
  } catch (e) {
    const size = node.opt ? node.opt.length : (node.data ? node.data.length : 'N/A');
    nodeName = `Node (size ${size})`;
  }

  console.log(
    `${prefix}${isLeft ? "└--- " : "┌--- "}${nodeName}${node.dist !== undefined && node.dist !== null ? `, dist: ${node.dist.toFixed(2)}` : "" // HDBSCAN uses 'dist'
    }`
  );

  const childPrefix = prefix + (isLeft ? "    " : "|   ");

  // HDBSCAN has 'left' and 'right' children
  if (node.right) {
    printTreeAsciiHdbscan(node.right, childPrefix, false);
  }
  if (node.left) {
    printTreeAsciiHdbscan(node.left, childPrefix, true);
  }
}


// --- @greenelab/hclust Specific Helper Functions ---

function getHclustNodeName(node: any, metadata: any[]): string {
    if (node.isLeaf) { // A leaf node in hclust usually means it has a single index
        if (node.indexes && node.indexes.length === 1 && metadata[node.indexes[0]]) {
            return metadata[node.indexes[0]].filename || `Item ${node.indexes[0]}`;
        }
        return `Leaf (idx ${node.indexes ? node.indexes.join(',') : 'N/A'})`;
    }
    // For internal nodes, list filenames or count
    if (node.indexes && node.indexes.length > 0) {
        if (node.indexes.length <= 3) { // Show a few filenames
 return `Cluster: ${node.indexes.map((i: number) => metadata[i] ? metadata[i].filename : `Item ${i}`).join(', ')}`;
        }
        return `Cluster (size ${node.indexes.length})`;
    }
    return "Internal Node";
}


function toVisualizationFormatHclust(node: any, metadata: any[]): any {
  if (!node) return null;

  const name = getHclustNodeName(node, metadata);

  // For @greenelab/hclust, children are in a 'children' array
  const children = node.children ? node.children.map(child => toVisualizationFormatHclust(child, metadata)).filter(Boolean) : [];

  return {
    name: name,
    // value: node.height, // or distance, depending on what you want to visualize
    children: children.length > 0 ? children : undefined // Omit empty children array for leaves
  };
}

function printTreeAsciiHclust(node, metadata, prefix = "", isLastChild = true, isRoot = true) {
    if (!node) return;

    const nodeName = getHclustNodeName(node, metadata);
    const heightInfo = node.height !== undefined ? `, height: ${node.height.toFixed(2)}` : "";

    if (isRoot) {
        console.log(`${nodeName}${heightInfo}`);
    } else {
        console.log(`${prefix}${isLastChild ? "└--- " : "├--- "}${nodeName}${heightInfo}`);
    }

    const children = node.children || [];
    children.forEach((child, index) => {
        const newPrefix = prefix + (isRoot ? "" : (isLastChild ? "    " : "|   "));
        printTreeAsciiHclust(child, metadata, newPrefix, index === children.length - 1, false);
    });
}


// --- Example Usage (you'll need to set up vectraDb simulator or actual DB) ---
async function main() {
  // Simulate vectraDb.listItems() if you don't have it running
  // @ts-ignore
  if (typeof vectraDb.listItems === 'undefined') {
    // @ts-ignore
    vectraDb.listItems = async () => {
      console.log("Using mock vectraDb.listItems");
      return [
        { id: "1", vector: [0.1, 0.2, 0.3], metadata: { filename: "doc1.txt", topic: "A" } },
        { id: "2", vector: [0.15, 0.25, 0.35], metadata: { filename: "doc2.txt", topic: "A" } },
        { id: "3", vector: [0.8, 0.7, 0.6], metadata: { filename: "doc3.txt", topic: "B" } },
        { id: "4", vector: [0.75, 0.65, 0.55], metadata: { filename: "doc4.txt", topic: "B" } },
        { id: "5", vector: [0.5, 0.5, 0.5], metadata: { filename: "doc5.txt", topic: "C" } },
      ];
    };
  }

  console.log("--- Running HDBSCAN ---");
  await performClustering('hdbscan');

  console.log("\n\n--- Running HCLUST ---");
  await performClustering('hclust');
}

// main(); // Uncomment to run example
