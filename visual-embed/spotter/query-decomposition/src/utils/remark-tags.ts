import { visit } from 'unist-util-visit';

export default function remarkTags() {
    return (tree: any) => {
        visit(tree, 'text', (node, index, parent) => {
            const re = /\[([^\]]+)\]/g;           // [...anything...]
            const pieces = [];
            let last = 0, m;

            while ((m = re.exec(node.value))) {
                // normal text before the [
                if (m.index > last) {
                    pieces.push({ type: 'text', value: node.value.slice(last, m.index) });
                }

                // the [...] itself – make a **custom** node
                pieces.push({
                    type: 'tag',               // ← your own node type
                    data: {
                        hName: 'Tag',            // name it will have in the HAST
                        hProperties: { value: m[1] }   // pass the inside text as a prop
                    }
                });

                last = m.index + m[0].length;
            }

            // text after the last ]
            if (last < node.value.length) {
                pieces.push({ type: 'text', value: node.value.slice(last) });
            }

            // replace the original node if we split it up
            if (pieces.length) parent.children.splice(index, 1, ...pieces);
        });
    };
}