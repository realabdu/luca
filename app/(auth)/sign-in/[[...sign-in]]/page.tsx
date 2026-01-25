import { SignIn } from "@clerk/nextjs";

export const runtime = 'edge';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light">
      <SignIn
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
