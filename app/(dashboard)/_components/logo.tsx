import Image from "next/image";

export const Logo = () => {
  return (
    <Image
      height={130}
      width={130}
      alt="logo"
      src="/logo.png"
      className="rounded-xl transition-transform duration-300 hover:scale-105 hover:rotate-1"
      priority={true}
    />
  )
}