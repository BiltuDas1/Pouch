import { useMemo, useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";

type Permission = "read" | "write" | "execute";
type Role = "owner" | "group" | "others";
const ROLES: { key: Role; label: string; short: string }[] = [
  { key: "owner", label: "Owner", short: "u" },
  { key: "group", label: "Group", short: "g" },
  { key: "others", label: "Others", short: "o" },
];
const PERMISSIONS: { key: Permission; label: string; value: number }[] = [
  { key: "read", label: "Read", value: 4 },
  { key: "write", label: "Write", value: 2 },
  { key: "execute", label: "Execute", value: 1 },
];
type PermissionState = Record<Role, Record<Permission, boolean>>;
const DEFAULTS: PermissionState = {
  owner: { read: false, write: false, execute: false },
  group: { read: false, write: false, execute: false },
  others: { read: false, write: false, execute: false },
};

function toOctal(state: PermissionState) {
  return ROLES.map(({ key }) =>
    PERMISSIONS.reduce(
      (sum, permission) =>
        sum + (state[key][permission.key] ? permission.value : 0),
      0,
    ),
  ).join("");
}
function toSymbolic(state: PermissionState) {
  return ROLES.map(({ key }) =>
    PERMISSIONS.map(({ key: permission }) =>
      state[key][permission]
        ? { read: "r", write: "w", execute: "x" }[permission]
        : "-",
    ).join(""),
  ).join("");
}

export default function ChmodCalculator() {
  const [permissions, setPermissions] = useState<PermissionState>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const octal = useMemo(() => toOctal(permissions), [permissions]);
  const symbolic = useMemo(() => toSymbolic(permissions), [permissions]);

  function toggle(role: Role, permission: Permission, checked: boolean) {
    setPermissions((current) => ({
      ...current,
      [role]: { ...current[role], [permission]: checked },
    }));
    setCopied(false);
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(`chmod ${octal} <file>`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function reset() {
    setPermissions(DEFAULTS);
    setCopied(false);
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <div className="rounded-2xl border border-border-primary bg-background-secondary p-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-78 border-collapse text-left">
              <thead>
                <tr className="border-b border-border-primary text-sm text-text-secondary">
                  <th className="px-3 py-3 font-medium">Permission</th>
                  {PERMISSIONS.map((p) => (
                    <th
                      key={p.key}
                      className="px-3 py-3 text-center font-medium"
                    >
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr
                    key={role.key}
                    className="border-b border-border-primary last:border-0"
                  >
                    <th className="px-3 py-4 font-medium text-text-primary">
                      {role.label}
                      <span className="ml-2 text-xs text-text-secondary">
                        ({role.short})
                      </span>
                    </th>
                    {PERMISSIONS.map((permission) => (
                      <td
                        key={permission.key}
                        className="px-3 py-4 text-center"
                      >
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md p-2 hover:bg-dark">
                          <input
                            type="checkbox"
                            checked={permissions[role.key][permission.key]}
                            onChange={(event) =>
                              toggle(
                                role.key,
                                permission.key,
                                event.target.checked,
                              )
                            }
                            className="size-4 cursor-pointer accent-white"
                            aria-label={`${role.label} ${permission.label}`}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border-primary bg-dark p-4">
              <p className="text-sm text-text-secondary">Octal</p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-wider text-text-primary">
                {octal}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Numeric permission mode
              </p>
            </div>
            <div className="rounded-xl border border-border-primary bg-dark p-4">
              <p className="text-sm text-text-secondary">Symbolic</p>
              <p className="mt-1 break-all font-mono text-2xl font-semibold tracking-wider text-text-primary">
                {symbolic}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Read, write, execute notation
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCommand}
              className="flex items-center gap-2 rounded-md bg-button-primary px-4 py-2.5 font-medium text-dark hover:bg-button-hover"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied command" : `Copy chmod ${octal}`}
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 rounded-md border border-border-primary px-4 py-2.5 text-text-primary hover:bg-dark"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
          <p className="mt-4 text-xs text-text-secondary">
            The command uses a placeholder filename: replace{" "}
            <code className="rounded bg-dark px-1 py-0.5">&lt;file&gt;</code>{" "}
            with your actual file or directory. This tool calculates permissions
            only; it does not change files on your system.
          </p>
        </div>
      </section>
    </ShadowModule>
  );
}
