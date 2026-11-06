import React from 'react'
import { DataTable } from './_components/data-table'
import { columns } from './_components/columns'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

const CoursesPage = async () => {

  const { userId } = await auth()

  if (!userId) {
    return redirect("/")
  }

  // A teacher manages every course in the workspace, regardless of which
  // account created it. Filtering by `userId` made the list look empty when
  // the logged-in teacher wasn't the original owner.
  const courses = await db.course.findMany({
    orderBy: {
      createdAt: "desc"
    }
  })


  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={courses}
      />

    </div>
  )
}

export default CoursesPage