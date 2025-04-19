"use client"
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';

function Header() {

  const path = usePathname();
  useEffect(() => {
    console.log(path)
  }, [])

  return (
    <div className='flex p-3 items-center justify-between bg-secondary shadow-sm'>
      <Image src={"/logo.png"} width={220} height={120} alt='logo' />
      <ul className='hidden md:flex gap-10'>
        <Link href={"/dashboard"}>
          <li className={`hover:text-purple-600 hover:font-bold transition-all
            cursor-pointer
            ${path == '/dashboard' && 'text-purple-600 font-bold'}
            `}

          >Dashboard</li>
        </Link>

        <li className={`hover:text-purple-600 hover:font-bold transition-all
            cursor-pointer
            ${path == '/dashboard/questions' && 'text-purple-600 font-bold'}
            `}>Questions</li>
        <Link href={"/dashboard/rating"}>
          <li className={`hover:text-purple-600 hover:font-bold transition-all
            cursor-pointer
            ${path == '/dashboard/rating' && 'text-purple-600 font-bold'}
            `}>Rating</li>
        </Link>
        <Link href={"/dashboard/how"}>
          <li className={`hover:text-purple-600 hover:font-bold transition-all
            cursor-pointer ${path == '/dashboard/how' && 'text-purple-600 font-bold'}`}
          >How it Works?</li>
        </Link>
      </ul>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <UserButton />
      </div>
    </div>
  )
}

export default Header