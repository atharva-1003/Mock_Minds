import { SignIn } from "@clerk/nextjs";
import Image from 'next/image';

export default function Page() {
  return (
    <section className="min-h-screen bg-white">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-12">
        {/* Left side with image and text */}
        <section className="relative flex h-32 items-end bg-gray-50 lg:col-span-5 lg:h-full xl:col-span-6">
          {/* Background Image */}
          <Image 
            src={"/bg.jpg"} 
            width={1200} 
            height={800} 
            quality={100} 
            className="absolute inset-0 h-full w-full object-cover" 
            alt='Background' 
            priority
          />

          {/* Subtle light overlay to make the text readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40"></div>

          {/* Text Content */}
          <div className="relative z-10 w-full lg:p-12">
            <h2 className="mt-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Welcome to Mock Minds
            </h2>

            <p className="mt-4 leading-relaxed text-gray-100">
              Welcome back! Please enter your credentials to access your account. If you're new here, consider signing up to unlock personalized features and stay updated. Your journey towards acing interviews starts with us!
            </p>
          </div>
        </section>

        {/* Right side with sign-in form */}
        <main className="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6">
          <div className="w-full max-w-xl lg:max-w-3xl">
            <div className="relative -mt-16 block lg:hidden">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
                Welcome to Mock Minds
              </h1>
            </div>

            <div className="mt-8">
              <SignIn 
                appearance={{
                  baseTheme: "light",
                  elements: {
                    formButtonPrimary: 'bg-[#0037FF] hover:bg-[#0037FF]/90 text-white text-sm normal-case h-12 rounded-xl font-medium',
                    card: 'bg-white shadow-lg rounded-xl p-8',
                    headerTitle: 'text-2xl font-bold text-gray-900',
                    headerSubtitle: 'text-gray-600',
                    socialButtonsBlockButton: 'border border-gray-300 hover:border-gray-400 bg-white text-gray-600 hover:bg-gray-50 h-12 rounded-xl',
                    socialButtonsBlockButtonText: 'text-gray-600',
                    formFieldLabel: 'text-gray-700 font-medium',
                    formFieldInput: 'h-12 px-4 py-2 bg-[#E8EBF2] border-none text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#0037FF] block w-full transition-all duration-150',
                    formFieldInputShowPasswordButton: 'hover:text-[#0037FF] text-gray-600',
                    footerActionLink: 'text-[#0037FF] hover:text-[#0037FF]/90',
                    dividerLine: 'bg-gray-200',
                    dividerText: 'text-gray-600',
                    formFieldSuccess: 'text-green-600',
                    formFieldError: 'text-red-600',
                    identityPreviewText: 'text-gray-600',
                    identityPreviewEditButton: 'text-[#0037FF] hover:text-[#0037FF]/90',
                    alternativeMethodsBlockButton: 'text-[#0037FF] hover:text-[#0037FF]/90',
                  },
                  layout: {
                    socialButtonsPlacement: "bottom",
                    showOptionalFields: false
                  }
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}