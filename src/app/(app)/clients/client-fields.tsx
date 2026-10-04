import { inputClass, labelClass } from "@/components/ui/styles";

type Defaults = { name?: string; contact?: string; company?: string | null };

export function ClientFields({ defaults = {} }: { defaults?: Defaults }) {
  return (
    <>
      <label className={labelClass}>
        Name
        <input name="name" placeholder="Name" required defaultValue={defaults.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        Contact
        <input name="contact" placeholder="Contact (email or phone)" required defaultValue={defaults.contact} className={inputClass} />
      </label>
      <label className={labelClass}>
        Company
        <input name="company" placeholder="Company (optional)" defaultValue={defaults.company ?? ""} className={inputClass} />
      </label>
    </>
  );
}
