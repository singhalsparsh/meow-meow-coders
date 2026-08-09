import { db } from "@/lib/db"
import { getCourses } from "@/actions/get-courses"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { Categories } from "./_components/categories"
import { SearchInput } from "@/components/search-input"
import { CoursesList } from "@/components/courses-list"

interface SearchPageProps {
  searchParams: Promise<{
    title: string;
    categoryId: string;
  }>
}
// This page reads the session (auth) and redirects based on it, so it must
// always run at request time instead of being statically prerendered.
export const dynamic = "force-dynamic";

const SearchPage = async (props: SearchPageProps) => {
  const searchParams = await props.searchParams;

  const { userId } = await auth()

  if (!userId) {
    return redirect("/sign-in")
  }

  const categories = await db.category.findMany({
    orderBy: {
      name: "asc"
    }
  })

  const courses = await getCourses({
    userId,
    ...searchParams,
  })

  return (
    <>
      <div className="px-6 pt-6 md:hidden md:mb-0 block">
        <SearchInput />
      </div>
      <div className="p-6 space-y-4">
        <Categories
          items={categories}
        />
        <CoursesList 
        items={courses}
        />
      </div>
    </>
  )
}

export default SearchPage