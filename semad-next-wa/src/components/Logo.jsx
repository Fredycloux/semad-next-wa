import Image from "next/image";

export default function Logo({ size = 72 }) {
  return (
    <Image
      src="/logo_semad.png"
      alt="SEMAD"
      width={size}
      height={size}
      priority
    />
  );
}
