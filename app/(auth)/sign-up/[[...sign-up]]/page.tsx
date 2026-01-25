import { SignUp } from "@clerk/nextjs";

export const runtime = 'edge';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
