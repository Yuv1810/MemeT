import NextImage, { type ImageProps } from "next/image";
export default function Image(props: ImageProps) {
  // Owner-provided external images load directly in the browser, without a server fetch proxy.
  return (
    <NextImage
      {...props}
      unoptimized={
        typeof props.src === "string" && props.src.startsWith("https://") ? true : props.unoptimized
      }
    />
  );
}
