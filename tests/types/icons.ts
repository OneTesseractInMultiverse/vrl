import { getIcon, listIcons, iconManifest, renderIcon, renderIconGeometry, resolveElementIconId, resolveAttributeIconId } from "@subvertic/vrl-icons";
import { getLineStyle } from "@subvertic/vrl-icons/registry";
import { renderIcon as standalone } from "@subvertic/vrl-icons/svg";
import { resolveAttributeIconId as attributeIcon } from "@subvertic/vrl-icons/semantics";
const definition = getIcon("bolt");
const svg: string = renderIcon("bolt", { size: 24, decorative: true });
const paths: readonly { readonly d: string }[] | undefined = definition?.paths;
const unknown: string | null = resolveElementIconId(null);
// @ts-expect-error Shared definitions are immutable.
iconManifest.icons[0]!.label = "changed";
// @ts-expect-error Shared geometry cannot be replaced by a consumer.
definition!.paths[0]!.d = "M0 0";
// @ts-expect-error Standalone size must be numeric.
renderIcon("tree", { size: "24" });
void [svg, paths, unknown, listIcons(), renderIconGeometry("tree"), resolveAttributeIconId("anchor", "bolts"), getLineStyle("rappel-line"), standalone("finish"), attributeIcon("anchor", "tree")];
