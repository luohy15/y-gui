export async function writeToStream(
  writer: WritableStreamDefaultWriter | undefined,
  data: any
): Promise<void> {
  if (!writer) return;
  
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function writeMcpStatus(
  writer: WritableStreamDefaultWriter | undefined,
  status: string,
  message: string,
  server?: string
): Promise<void> {
  if (!writer) return;
  
  await writeToStream(writer, {
    type: "mcp_status",
    status,
    message,
    ...(server ? { server } : {})
  });
}
